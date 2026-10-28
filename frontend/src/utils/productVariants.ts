import type { Product } from "../types";

export type VariantProduct = Product & { ram?: number; storage?: number };

export type VariantGroup = {
  products: VariantProduct[];
  ramValues: number[];
  storageValues: number[];
};

const variantKey = (product: Product) =>
  `${product.ram ?? "_"}|${product.storage ?? "_"}`;

/** Returns only unambiguous, purchasable new-phone variants for one catalogue device. */
export function getVariantGroup(
  products: Product[],
  current: Product,
): VariantGroup | null {
  if (current.category !== "new" || !current.catalogueDeviceId) return null;
  const related = products.filter(
    (product) =>
      product.category === "new" &&
      product.catalogueDeviceId === current.catalogueDeviceId,
  ) as VariantProduct[];
  const meaningful = related.filter(
    (product) => product.ram !== undefined || product.storage !== undefined,
  );
  if (meaningful.length < 2) return null;

  const counts = new Map<string, number>();
  meaningful.forEach((product) =>
    counts.set(variantKey(product), (counts.get(variantKey(product)) || 0) + 1),
  );
  if (
    (current.ram !== undefined || current.storage !== undefined) &&
    counts.get(variantKey(current))! > 1
  )
    return null;
  const unique = meaningful.filter(
    (product) => counts.get(variantKey(product)) === 1,
  );
  const ramValues = [
    ...new Set(
      unique.flatMap((product) =>
        product.ram === undefined ? [] : [product.ram],
      ),
    ),
  ].sort((a, b) => a - b);
  const storageValues = [
    ...new Set(
      unique.flatMap((product) =>
        product.storage === undefined ? [] : [product.storage],
      ),
    ),
  ].sort((a, b) => a - b);

  if (ramValues.length < 2 && storageValues.length < 2) return null;
  return { products: unique, ramValues, storageValues };
}

export function findVariantProduct(
  group: VariantGroup,
  ram?: number,
  storage?: number,
): VariantProduct | null {
  const matches = group.products.filter(
    (product) =>
      (ram === undefined || product.ram === ram) &&
      (storage === undefined || product.storage === storage),
  );
  return matches.length === 1 ? matches[0] : null;
}
