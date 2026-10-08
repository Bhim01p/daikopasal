import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HttpError, validateProduct } from "./validation.mjs";

export const catalogueVersion = (products) =>
  createHash("sha256").update(JSON.stringify(products)).digest("hex");
const identity = (product) =>
  `${product.brand}|${product.name}|${product.category}`.toLowerCase();
export function previewInventory(input, current) {
  if (
    !Array.isArray(input?.products) ||
    input.products.length < 1 ||
    input.products.length > 50
  )
    throw new HttpError(
      400,
      "Import between 1 and 50 real products at a time.",
    );
  const real = current.products.filter((product) => product.isSample === false);
  const seen = new Set(real.map(identity));
  const products = input.products.map((entry, index) => {
    try {
      if (
        !entry ||
        typeof entry !== "object" ||
        Array.isArray(entry) ||
        entry.isSample === true
      )
        throw new HttpError(400, "Only real product details can be imported.");
      const product = validateProduct({
        ...entry,
        isSample: false,
        image:
          entry.image ||
          (entry.category === "accessory"
            ? "/assets/cover.svg"
            : "/assets/phone.svg"),
        color: entry.color || "#c1d4d1",
        description: entry.description || entry.name,
        specs: entry.specs || {},
      });
      const key = identity(product);
      if (seen.has(key))
        throw new HttpError(
          400,
          "This product is already listed. Use a distinct name for each storage/colour variant, or edit the existing listing.",
        );
      seen.add(key);
      return product;
    } catch (error) {
      if (error instanceof HttpError)
        throw new HttpError(
          error.status,
          `Product ${index + 1}: ${error.message}`,
        );
      throw error;
    }
  });
  return {
    products,
    sampleCount: current.products.length - real.length,
    preservedCount: real.length,
    catalogueVersion: catalogueVersion(current.products),
  };
}

export async function replaceSamples(input, store, dataFile) {
  const current = store.read();
  const preview = previewInventory(input, current);
  if (input.catalogueVersion !== preview.catalogueVersion)
    throw new HttpError(
      409,
      "The catalogue changed after your preview. Choose the file again to review the latest counts.",
    );
  const real = current.products.filter((product) => product.isSample === false);
  const slugs = new Set(real.map((product) => product.slug));
  const products = preview.products.map((entry) => {
    const id = randomUUID();
    let slug =
      `${entry.brand}-${entry.name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "product";
    if (slugs.has(slug)) slug += "-" + id.slice(0, 8);
    slugs.add(slug);
    return { ...entry, id, slug };
  });
  const backupName = `catalogue-${Date.now()}-${randomUUID()}.json`;
  const directory = path.join(
    path.dirname(path.resolve(dataFile)),
    "catalogue-backups",
  );
  if (store.backupCatalogue) await store.backupCatalogue(backupName, current);
  else {
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      path.join(directory, backupName),
      JSON.stringify(current, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
  }
  store.commit({ ...current, products: [...products, ...real] });
  return {
    imported: products.length,
    removedSamples: preview.sampleCount,
    preserved: real.length,
    backup: `catalogue-backups/${backupName}`,
  };
}
