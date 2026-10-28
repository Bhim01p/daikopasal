import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/phone_descriptions.json",
);
const key = (brand, model) =>
  `${String(brand || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")}|${String(model || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")}`;
let descriptions;
export function catalogueDescriptionForProduct(product) {
  if (!descriptions) {
    descriptions = new Map();
    if (existsSync(file))
      for (const item of JSON.parse(readFileSync(file, "utf8")))
        descriptions.set(key(item.brand, item.model), item);
  }
  const item = descriptions.get(key(product.brand, product.name));
  return item
    ? {
        en: item.description_en,
        ne: item.description_ne,
        deviceId: item.device_id,
      }
    : undefined;
}
