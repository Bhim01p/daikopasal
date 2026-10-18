import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "data", "phone_images.csv");
const approved = /^(approved|licensed(?:[_ /-]?reuse)?|explicit_reuse_license_found)$/i;
let cache;

function parseCsv(text) {
  const rows = [], row = [];
  let field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push([...row]); row.length = 0; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push([...row]); }
  const headers = rows.shift() || [];
  return rows.filter((r) => r.some((v) => String(v ?? "").trim())).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h.trim(), String(r[i] ?? "").trim()])),
  );
}
function key(brand, model) {
  return `${String(brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "")}|${String(model || "").toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}
function transformed(url) {
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
}
export function catalogueImageForProduct(product) {
  if (!cache) {
    cache = new Map();
    if (existsSync(manifestPath)) for (const row of parseCsv(readFileSync(manifestPath, "utf8"))) {
      const sourceRightsApproved = ["official_manufacturer_press_asset", "official_manufacturer_asset"].includes(row.source_rights_status);
      if (row.image_status === "uploaded" && row.cloudinary_url && (approved.test(row.usage_rights_status) || sourceRightsApproved)) {
        let images = [{ url: row.cloudinary_url, sourceUrl: row.source_url, license: row.license, attributionRequired: row.attribution_required === "Yes", position: 1 }];
        try { if (row.catalogue_images) images = JSON.parse(row.catalogue_images); } catch { /* retain the legacy main image */ }
        images = images.filter((image) => image?.url).slice(0, 3).map((image, index) => ({ ...image, url: transformed(image.url), position: image.position || index + 1 }));
        cache.set(key(row.brand, row.model), { url: images[0]?.url || transformed(row.cloudinary_url), images, deviceId: row.device_id, attributionRequired: images[0]?.attributionRequired ?? row.attribution_required === "Yes", sourceUrl: images[0]?.sourceUrl || row.source_url, license: images[0]?.license || row.license, sourceRightsStatus: row.source_rights_status });
      }
    }
  }
  if (product.category === "accessory") return undefined;
  return cache.get(key(product.brand, product.name));
}
