import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { uploadPhoneCatalogueImage } from "../backend/phone-catalogue-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [
  path.join(root, ".env.local"),
  path.join(root, "backend", ".env"),
])
  if (existsSync(file)) loadEnvFile(file);
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const batch = args.find((a) => a.startsWith("--batch="))?.slice(8) || "batch-1";
const batchSuffix =
  batch === "batch-1" ? "" : batch.replace(/^batch-/, "batch");
const candidatesPath = path.join(
  root,
  `data/phone-reference/image_candidates${batchSuffix ? `_${batchSuffix}` : ""}.json`,
);
const batchesPath = path.join(
  root,
  `data/phone-reference/image_batches${batchSuffix ? `_${batchSuffix}` : ""}.json`,
);
const manifestPath = path.join(root, "data/phone_images.csv");
const maxBytes = 10 * 1024 * 1024;

function parseCsv(text) {
  const rows = [],
    row = [];
  let field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push([...row]);
      row.length = 0;
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push([...row]);
  }
  const headers = (rows.shift() || []).map((h) =>
    h.replace(/^\uFEFF/, "").trim(),
  );
  return rows
    .filter((r) => r.some((v) => String(v ?? "").trim()))
    .map((r) =>
      Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "").trim()])),
    );
}
function csvValue(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}
function writeManifest(rows) {
  const headers = [
    "device_id",
    "brand",
    "model",
    "source_url",
    "license",
    "license_source_url",
    "attribution_required",
    "usage_rights_status",
    "source_rights_status",
    "catalogue_images",
    "cloudinary_url",
    "cloudinary_public_id",
    "image_status",
    "updated_at",
  ];
  writeFileSync(
    manifestPath,
    `${headers.join(",")}\n${rows.map((r) => headers.map((h) => csvValue(r[h])).join(",")).join("\n")}\n`,
  );
}
function imageEntry(c, result) {
  return {
    position: Number(c.position),
    url: result.secure_url,
    sourceUrl: c.candidate_source_url,
    resolvedImageUrl: c.resolved_image_url,
    provider: c.provider,
    sourceRightsStatus: c.source_rights_status,
    license: c.license || "",
    licenseSourceUrl: c.license_source_url || "",
    attributionRequired: c.attribution_required || "",
    imageStatus: "uploaded",
    publicId: result.public_id,
  };
}
async function download(c) {
  const response = await fetch(c.resolved_image_url || c.image_url, {
    redirect: "follow",
    headers: {
      Accept: "image/*",
      "User-Agent": "MachhapuchhreeElectronicsCatalogueImporter/1.0",
    },
  });
  const type = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .toLowerCase();
  const declared = Number(response.headers.get("content-length") || 0);
  const headerAllowed =
    type?.startsWith("image/") || type === "application/octet-stream";
  if (!response.ok || !headerAllowed || (declared && declared > maxBytes))
    throw new Error(
      `invalid image response (${response.status}, ${type || "unknown"})`,
    );
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > maxBytes)
    throw new Error("image exceeds 10 MB limit or is empty");
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp =
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP";
  if (!isJpeg && !isPng && !isWebp)
    throw new Error("downloaded binary is not a supported image");
  const dir = path.join(root, ".tmp-phone-candidates");
  mkdirSync(dir, { recursive: true });
  const file = path.join(
    dir,
    `${c.device_id}-${c.position}-${process.pid}.jpg`,
  );
  writeFileSync(file, buffer);
  return file;
}
const candidates = JSON.parse(readFileSync(candidatesPath, "utf8")).filter(
  (c) => c.batch_id === batch && c.status === "candidate_resolved",
);
const allCandidates = JSON.parse(readFileSync(candidatesPath, "utf8"));
const rows = parseCsv(readFileSync(manifestPath, "utf8"));
const byId = new Map(rows.map((r) => [r.device_id, r]));
const seen = new Set();
const errors = [];
let uploaded = 0,
  skipped = 0;
for (const c of candidates) {
  const pos = Number(c.position);
  const key = `${c.device_id}:${pos}`;
  if (
    !c.device_id ||
    ![1, 2, 3].includes(pos) ||
    seen.has(key) ||
    !/^https?:\/\//i.test(c.resolved_image_url || c.image_url) ||
    ![
      "official_manufacturer_press_asset",
      "official_manufacturer_asset",
      "licensed_reuse",
      "approved",
      "explicit_reuse_license_found",
    ].includes(c.source_rights_status)
  ) {
    errors.push(`${key}: candidate failed safety validation`);
    continue;
  }
  seen.add(key);
  const row = byId.get(c.device_id);
  if (!row) {
    errors.push(`${key}: device not found in manifest`);
    continue;
  }
  let gallery = [];
  try {
    gallery = row.catalogue_images ? JSON.parse(row.catalogue_images) : [];
  } catch {
    gallery = [];
  }
  if (pos === 1 && row.cloudinary_public_id) {
    skipped++;
    continue;
  }
  if (gallery.some((i) => Number(i.position) === pos && i.publicId)) {
    skipped++;
    continue;
  }
  if (dryRun) {
    uploaded++;
    continue;
  }
  let temp;
  try {
    temp = await download(c);
    const result = await uploadPhoneCatalogueImage(c.device_id, temp, pos);
    const entry = imageEntry(c, result);
    if (pos === 1) {
      row.cloudinary_url = result.secure_url;
      row.cloudinary_public_id = result.public_id;
      row.source_url = c.candidate_source_url;
      row.license = c.license || "";
      row.license_source_url = c.license
        ? c.license_source_url || c.candidate_source_url
        : "";
      row.attribution_required =
        c.license && /CC BY/i.test(c.license) ? "Yes" : "";
      row.usage_rights_status = c.source_rights_status;
      row.source_rights_status = c.source_rights_status;
      row.image_status = "uploaded";
    }
    gallery = gallery.filter((i) => Number(i.position) !== pos);
    gallery.push(entry);
    gallery.sort((a, b) => Number(a.position) - Number(b.position));
    row.catalogue_images = JSON.stringify(gallery);
    row.updated_at = new Date().toISOString();
    uploaded++;
  } catch (error) {
    errors.push(`${key}: ${error.message}`);
  } finally {
    if (temp && existsSync(temp)) unlinkSync(temp);
  }
}
if (!dryRun) writeManifest(rows);
if (!dryRun) {
  const completed = new Set(
    candidates
      .filter(
        (c) =>
          !errors.some((e) => e.startsWith(`${c.device_id}:${c.position}:`)),
      )
      .map((c) => `${c.device_id}:${c.position}`),
  );
  for (const c of allCandidates)
    if (completed.has(`${c.device_id}:${c.position}`)) {
      c.status = "uploaded";
      c.cloudinary_public_id = `machhapuchhree-electronics/catalogue/phones/${c.device_id}/${Number(c.position) === 1 ? "main" : c.position}`;
      c.updated_at = new Date().toISOString();
    }
  writeFileSync(candidatesPath, `${JSON.stringify(allCandidates, null, 2)}\n`);
}
if (!dryRun) {
  const tracker = JSON.parse(readFileSync(batchesPath, "utf8"));
  for (const d of tracker.devices || []) {
    const images = byId.get(d.device_id)?.catalogue_images;
    let count = 0;
    try {
      count = JSON.parse(images || "[]").filter((i) => i?.publicId).length;
    } catch {}
    d.current_image_count = count;
    d.existing_positions = Array.from({ length: count }, (_, i) => i + 1);
    d.missing_positions = [1, 2, 3].filter(
      (p) => !d.existing_positions.includes(p),
    );
    d.workflow_status =
      count === 3
        ? "uploaded"
        : count
          ? "partially_uploaded"
          : d.workflow_status;
    d.last_completed_part = count ? 4 : d.last_completed_part;
    d.updated_at = new Date().toISOString();
  }
  writeFileSync(batchesPath, `${JSON.stringify(tracker, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      batch,
      dryRun,
      selected: candidates.length,
      wouldUpload: dryRun ? uploaded : 0,
      uploaded: dryRun ? 0 : uploaded,
      skipped,
      failed: errors.length,
      errors,
    },
    null,
    2,
  ),
);
