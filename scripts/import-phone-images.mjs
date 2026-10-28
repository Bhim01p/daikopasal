import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uploadPhoneCatalogueImage } from "../backend/phone-catalogue-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [
  path.join(root, ".env.local"),
  path.join(root, "backend", ".env"),
])
  if (existsSync(file)) loadEnvFile(file);

const manifestPath = path.join(root, "data", "phone_images.csv");
const maxBytes = 10 * 1024 * 1024;
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const equalsDevice = args.find((arg) => arg.startsWith("--device="))?.slice(9);
const deviceIndex = args.indexOf("--device");
const deviceArg =
  equalsDevice || (deviceIndex >= 0 ? args[deviceIndex + 1] : undefined);
if (
  (deviceIndex >= 0 && !deviceArg) ||
  args.some(
    (arg, i) =>
      !["--dry-run", "--force", "--device"].includes(arg) &&
      !arg.startsWith("--device=") &&
      !(deviceIndex >= 0 && i === deviceIndex + 1),
  )
) {
  console.error(
    "Usage: node scripts/import-phone-images.mjs [--dry-run] [--force] [--device <device_id>]",
  );
  process.exit(1);
}

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
  const headers = rows.shift() || [];
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) =>
      Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()])),
    );
}
function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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
async function resolveSourceUrl(url) {
  const source = new URL(url);
  if (
    source.hostname !== "commons.wikimedia.org" ||
    !source.pathname.startsWith("/wiki/File:")
  )
    return url;
  const title = decodeURIComponent(
    source.pathname.slice("/wiki/".length),
  ).replace(/\s+/g, " ");
  console.log("Resolving Wikimedia Commons source...");
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    titles: title,
    origin: "*",
  });
  const response = await fetch(api, {
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "User-Agent": "MachhapuchhreeElectronicsCatalogueImporter/1.0",
    },
  });
  if (!response.ok) throw new Error("Wikimedia Commons API request failed");
  const data = await response.json();
  const page = Object.values(data?.query?.pages || {})[0];
  const resolved = page?.imageinfo?.[0]?.url;
  if (typeof resolved !== "string" || !resolved)
    throw new Error("Wikimedia Commons image URL was not found");
  return resolved;
}
async function downloadImage(url) {
  const resolvedUrl = await resolveSourceUrl(url);
  const response = await fetch(resolvedUrl, { redirect: "error" });
  const type = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .toLowerCase();
  const declared = Number(response.headers.get("content-length") || 0);
  if (
    !response.ok ||
    !type?.startsWith("image/") ||
    (declared && declared > maxBytes)
  )
    throw new Error("source is not an allowed image response");
  if (resolvedUrl !== url) console.log(`Resolved image response: ${type}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > maxBytes)
    throw new Error("source image exceeds the 10 MB limit");
  const extension =
    type === "image/png"
      ? ".png"
      : type === "image/webp"
        ? ".webp"
        : type === "image/gif"
          ? ".gif"
          : ".jpg";
  const temp = path.join(root, `.phone-image-${process.pid}${extension}`);
  writeFileSync(temp, data);
  return temp;
}

if (!existsSync(manifestPath))
  throw new Error(`Missing manifest: ${manifestPath}`);
const rows = parseCsv(readFileSync(manifestPath, "utf8"));
const selected = deviceArg
  ? rows.filter((row) => row.device_id === deviceArg)
  : rows;
if (deviceArg && !selected.length)
  throw new Error(`Unknown device_id: ${deviceArg}`);
const summary = {
  selected: selected.length,
  wouldUpload: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
};
for (const row of selected) {
  const approvedReuse =
    /^(approved|licensed(?:[_ /-]?reuse)?|explicit_reuse_license_found)$/i.test(
      row.usage_rights_status || "",
    );
  let gallery = [];
  try {
    gallery = Array.isArray(JSON.parse(row.catalogue_images || "[]"))
      ? JSON.parse(row.catalogue_images)
      : [];
  } catch {
    gallery = [];
  }
  const needsGallery = gallery.some(
    (image) =>
      image.position > 1 &&
      image.source_url &&
      !image.cloudinary_public_id &&
      image.license &&
      image.license_source_url &&
      /^(approved|licensed(?:[_ /-]?reuse)?|explicit_reuse_license_found)$/i.test(
        image.usage_rights_status || "",
      ),
  );
  if (
    ["approved", "failed"].includes(row.image_status) &&
    row.source_url &&
    row.license &&
    row.license_source_url &&
    approvedReuse &&
    (force || !row.cloudinary_public_id || needsGallery)
  ) {
    summary.wouldUpload++;
    if (dryRun) continue;
    let temp;
    try {
      if (force || !row.cloudinary_public_id) {
        temp = await downloadImage(row.source_url);
        const result = await uploadPhoneCatalogueImage(row.device_id, temp, 1);
        row.cloudinary_url = result.secure_url;
        row.cloudinary_public_id = result.public_id;
        if (!gallery.length)
          gallery = [
            {
              position: 1,
              cloudinary_url: result.secure_url,
              cloudinary_public_id: result.public_id,
              source_url: row.source_url,
              license: row.license,
              license_source_url: row.license_source_url,
              attribution_required: row.attribution_required,
              usage_rights_status: row.usage_rights_status,
            },
          ];
        else {
          gallery[0] = {
            ...gallery[0],
            position: 1,
            cloudinary_url: result.secure_url,
            cloudinary_public_id: result.public_id,
          };
        }
        row.image_status = "uploaded";
        if (temp && existsSync(temp)) {
          unlinkSync(temp);
          temp = undefined;
        }
      }
      for (const image of gallery.filter(
        (candidate) =>
          candidate.position > 1 &&
          candidate.source_url &&
          !candidate.cloudinary_public_id,
      )) {
        if (
          !image.license ||
          !image.license_source_url ||
          !/^(approved|licensed(?:[_ /-]?reuse)|explicit_reuse_license_found)$/i.test(
            image.usage_rights_status || "",
          )
        )
          continue;
        temp = await downloadImage(image.source_url);
        const result = await uploadPhoneCatalogueImage(
          row.device_id,
          temp,
          image.position,
        );
        image.cloudinary_url = result.secure_url;
        image.cloudinary_public_id = result.public_id;
        image.image_status = "uploaded";
        if (temp && existsSync(temp)) {
          unlinkSync(temp);
          temp = undefined;
        }
      }
      row.catalogue_images = JSON.stringify(gallery.slice(0, 3));
      row.updated_at = new Date().toISOString();
      summary.uploaded++;
    } catch (error) {
      row.image_status = "failed";
      row.updated_at = new Date().toISOString();
      summary.failed++;
      console.error(
        `${row.device_id}: ${error instanceof Error ? error.message : "upload failed"}`,
      );
    } finally {
      if (temp && existsSync(temp)) unlinkSync(temp);
    }
  } else summary.skipped++;
}
if (!dryRun && summary.uploaded + summary.failed > 0) writeManifest(rows);
console.log(JSON.stringify({ dryRun, ...summary }, null, 2));
