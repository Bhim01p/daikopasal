import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(root, "data", "phone_images.csv");
const sourcePath = process.argv[2];
const headers = [
  "device_id",
  "brand",
  "model",
  "source_url",
  "license",
  "license_source_url",
  "attribution_required",
  "usage_rights_status",
  "cloudinary_url",
  "cloudinary_public_id",
  "image_status",
  "updated_at",
];

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
  const rawHeaders = rows.shift() || [];
  const sourceHeaders = rawHeaders.map((header, index) =>
    String(header ?? "")
      .replace(index === 0 ? /^\uFEFF/ : /^/, "")
      .trim(),
  );
  let blankRows = 0;
  const parsedRows = rows
    .filter((r) => {
      const blank = r.every((value) => String(value ?? "").trim() === "");
      if (blank) blankRows++;
      return !blank;
    })
    .map((r) =>
      Object.fromEntries(
        sourceHeaders.map((h, i) => [h, String(r[i] ?? "").trim()]),
      ),
    );
  return { headers: sourceHeaders, rows: parsedRows, blankRows };
}
function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
function write(rows) {
  writeFileSync(
    targetPath,
    `${headers.join(",")}\n${rows.map((r) => headers.map((h) => csvValue(r[h])).join(",")).join("\n")}\n`,
  );
}

if (!existsSync(targetPath)) throw new Error("Missing data/phone_images.csv");
if (!sourcePath) {
  console.error(
    "Usage: node scripts/merge-phone-image-sources.mjs path/to/researched-image-sources.csv",
  );
  process.exit(1);
}
if (!existsSync(sourcePath))
  throw new Error(`Source manifest not found: ${sourcePath}`);

const targetData = parseCsv(readFileSync(targetPath, "utf8"));
const rows = targetData.rows;
const sourceData = parseCsv(readFileSync(sourcePath, "utf8"));
if (process.argv.includes("--inspect")) {
  console.log(
    JSON.stringify(
      {
        headers: sourceData.headers,
        parsedRows: sourceData.rows.length,
        blankRowsIgnored: sourceData.blankRows,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const sources = sourceData.rows;
const byId = new Map(rows.map((row) => [row.device_id, row]));
const seen = new Set();
for (const source of sources) {
  const deviceId = String(source.device_id ?? "").trim();
  if (!deviceId)
    throw new Error(
      `Missing source device_id in parsed source row: ${JSON.stringify(source)}`,
    );
  if (seen.has(deviceId))
    throw new Error(`Duplicate source device_id: ${deviceId}`);
  seen.add(deviceId);
  const target = byId.get(deviceId);
  if (!target)
    throw new Error(
      `Source device_id is not in the catalogue manifest: ${deviceId}`,
    );
  source.source_url = String(
    source.source_url || source.image_source_url || "",
  ).trim();
  for (const key of [
    "source_url",
    "license",
    "license_source_url",
    "attribution_required",
    "usage_rights_status",
  ])
    if (source[key] !== undefined) target[key] = source[key];
  const approved = Boolean(
    target.source_url &&
    target.license &&
    target.license_source_url &&
    /^(approved|licensed(?:[_ /-]?reuse)?|explicit_reuse_license_found)$/i.test(
      target.usage_rights_status,
    ),
  );
  if (target.image_status !== "uploaded")
    target.image_status = approved
      ? target.image_status === "failed"
        ? "failed"
        : "approved"
      : "pending";
  if (target.image_status !== "uploaded")
    target.updated_at = new Date().toISOString();
}
write(rows);
console.log(
  JSON.stringify(
    {
      merged: sources.length,
      devices: rows.length,
      approved: rows.filter((r) => r.image_status === "approved").length,
      pending: rows.filter((r) => r.image_status !== "approved").length,
    },
    null,
    2,
  ),
);
