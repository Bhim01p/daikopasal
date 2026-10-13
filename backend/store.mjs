import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function seedStore(initialProducts) {
  const products =
    initialProducts ||
    JSON.parse(
      readFileSync(new URL("./seed/products.json", import.meta.url), "utf8"),
    );
  return normalizeStore({ products, orders: [] });
}
export function upgradeStarterCatalogue(current) {
  if (current.catalogueRevision === 2) return current;
  const legacy = JSON.parse(
    readFileSync(
      new URL("./seed/legacy-signatures.json", import.meta.url),
      "utf8",
    ),
  );
  const removable = current.products.filter(
    (p) =>
      p.isSample !== false &&
      legacy.some(
        (old) =>
          old.id === p.id &&
          old.name === p.name &&
          old.description === p.description &&
          old.image === p.image,
      ),
  );
  const retained = current.products.filter((p) => !removable.includes(p));
  const starters = seedStore().products;
  const existing = new Set(retained.map((p) => p.id));
  return {
    ...current,
    catalogueRevision: 2,
    products: removable.length
      ? [...retained, ...starters.filter((p) => !existing.has(p.id))]
      : retained,
    ...(removable.length ? { previousStarterCatalogue: removable } : {}),
  };
}
export function normalizeStore(current) {
  if (!Array.isArray(current.products) || !Array.isArray(current.orders))
    throw new Error(
      "Invalid store file. Restore a valid backup before starting.",
    );
  current = {
    ...current,
    products: current.products.map((product) => {
      const stockQuantity =
        product.stockQuantity === undefined
          ? product.isSample !== false
            ? product.available
              ? 10
              : 0
            : null
          : product.stockQuantity;
      if (
        stockQuantity !== null &&
        (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0)
      )
        throw new Error(
          "Invalid product stock. Restore a valid backup before starting.",
        );
      const stockVersion = product.stockVersion ?? 0;
      if (!Number.isSafeInteger(stockVersion) || stockVersion < 0)
        throw new Error("Invalid stock version in store file.");
      return {
        ...product,
        stockQuantity,
        stockVersion,
        available: stockQuantity !== null && stockQuantity > 0,
      };
    }),
    emailQueue: current.emailQueue ?? [],
    customers: current.customers ?? [],
    customerSessions: current.customerSessions ?? [],
    staffAccounts: current.staffAccounts ?? [],
  };
  if (
    !Array.isArray(current.customers) ||
    !Array.isArray(current.customerSessions) ||
    !Array.isArray(current.staffAccounts)
  )
    throw new Error("Invalid customer store.");
  if (!Array.isArray(current.emailQueue))
    throw new Error("Invalid email queue in store file.");
  return current;
}
export function createStore(
  file,
  { initialProducts, migrateStarter = true } = {},
) {
  let current = existsSync(file)
    ? normalizeStore(JSON.parse(readFileSync(file, "utf8")))
    : seedStore(initialProducts);
  const previous = current;
  if (migrateStarter) current = upgradeStarterCatalogue(current);
  function commit(next) {
    mkdirSync(path.dirname(file), { recursive: true });
    const temporary = file + ".tmp";
    writeFileSync(temporary, JSON.stringify(next, null, 2) + "\n", {
      mode: 0o600,
    });
    renameSync(temporary, file);
    current = next;
  }
  if (!existsSync(file) || previous !== current) commit(current);
  return { read: () => current, commit };
}
export const defaultStorePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data/store.json",
);
