import { HttpError, text } from "./validation.mjs";

const fields = new Set(["brand", "model", "descriptionEn", "descriptionNe", "specs", "variants", "images"]);

function cleanValue(field, value) {
  if (["brand", "model", "descriptionEn", "descriptionNe"].includes(field))
    return text(value, field, 1, field.startsWith("description") ? 4000 : 120);
  if (field === "specs") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Specifications are invalid.");
    const result = {};
    for (const [name, item] of Object.entries(value)) {
      const cleanName = text(name, "Specification name", 1, 80);
      result[cleanName] = text(item, "Specification value", 1, 500);
    }
    return result;
  }
  if (field === "variants") {
    if (!Array.isArray(value) || value.length > 30) throw new HttpError(400, "Variants are invalid.");
    const seen = new Set();
    return value.map((variant) => {
      if (!variant || typeof variant !== "object") throw new HttpError(400, "Variant is invalid.");
      const ram = variant.ram === undefined ? undefined : Number(variant.ram);
      const storage = variant.storage === undefined ? undefined : Number(variant.storage);
      if (ram === undefined && storage === undefined) throw new HttpError(400, "Variant must include RAM or storage.");
      if (ram !== undefined && (!Number.isInteger(ram) || ram < 1 || ram > 64)) throw new HttpError(400, "Variant RAM is invalid.");
      if (storage !== undefined && (!Number.isInteger(storage) || storage < 16 || storage > 2048)) throw new HttpError(400, "Variant storage is invalid.");
      const key = `${ram ?? ""}/${storage ?? ""}`;
      if (seen.has(key)) throw new HttpError(400, "Duplicate catalogue variant.");
      seen.add(key);
      return { ...(ram === undefined ? {} : { ram }), ...(storage === undefined ? {} : { storage }) };
    });
  }
  if (field === "images") {
    if (!Array.isArray(value) || value.length > 3) throw new HttpError(400, "Catalogue images are invalid.");
    return value.map((image, index) => {
      if (!image || typeof image !== "object" || typeof image.url !== "string" || !/^https:\/\//.test(image.url)) throw new HttpError(400, "Catalogue image is invalid.");
      return { ...image, position: index + 1 };
    });
  }
  throw new HttpError(400, `Unsupported catalogue field: ${field}.`);
}

export function validateCatalogueOverride(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "Invalid catalogue override.");
  const output = {};
  for (const [field, value] of Object.entries(input)) {
    if (!fields.has(field)) throw new HttpError(400, `Unsupported catalogue field: ${field}.`);
    output[field] = cleanValue(field, value);
  }
  return output;
}

export function mergeCatalogueDevice(base, override) {
  if (!override) return base;
  const { updatedAt, updatedBy, ...fieldsOnly } = override;
  return { ...base, ...fieldsOnly, deviceId: base.deviceId };
}

export async function effectiveCatalogue(store, baseDevices) {
  const overrides = await readCatalogueOverrides(store);
  return baseDevices.map((base) => mergeCatalogueDevice(base, overrides[base.deviceId]));
}

export async function readCatalogueOverrides(store) {
  if (store.readCatalogueOverrides) return store.readCatalogueOverrides();
  return store.read().catalogueOverrides || {};
}

export async function saveCatalogueOverride(store, deviceId, override, updatedBy) {
  const cleanId = text(deviceId, "Device ID", 1, 160);
  const clean = validateCatalogueOverride(override);
  if (store.saveCatalogueOverride) return store.saveCatalogueOverride(cleanId, clean, updatedBy);
  const current = store.read();
  store.commit({ ...current, catalogueOverrides: { ...(current.catalogueOverrides || {}), [cleanId]: { ...clean, updatedAt: new Date().toISOString(), updatedBy } } });
  return clean;
}

export async function resetCatalogueOverride(store, deviceId, field) {
  const cleanId = text(deviceId, "Device ID", 1, 160);
  if (store.deleteCatalogueOverride) return store.deleteCatalogueOverride(cleanId, field);
  const current = store.read();
  const existing = { ...(current.catalogueOverrides || {}) };
  if (field) {
    if (!fields.has(field)) throw new HttpError(400, "Unsupported catalogue field.");
    if (existing[cleanId]) { const next = { ...existing[cleanId] }; delete next[field]; if (Object.keys(next).length) existing[cleanId] = next; else delete existing[cleanId]; }
  } else delete existing[cleanId];
  store.commit({ ...current, catalogueOverrides: existing });
}
