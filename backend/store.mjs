import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { upgradePhoneCatalogue } from "./phone-reference.mjs";
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
// Owner-approved one-time opening quantity. Never refill sold or edited inventory.
export function upgradeStarterStock(current) {
  if (current.starterStockRevision === 1) return current;
  const starters = seedStore().products;
  return {
    ...current,
    starterStockRevision: 1,
    products: current.products.map((product) => {
      const seed = starters.find((p) => p.id === product.id);
      const usedInOrder = current.orders.some((order) =>
        order.items?.some((item) => (item.product?.id || item.productId) === product.id),
      );
      const untouched =
        seed &&
        product.stockQuantity === 0 &&
        product.stockVersion === 0 &&
        [...new Set([...Object.keys(seed), ...Object.keys(product)])].every(
          (key) => JSON.stringify(product[key]) === JSON.stringify(seed[key]),
        );
      return untouched && !usedInOrder
        ? { ...product, stockQuantity: 1, stockVersion: 1, available: true }
        : product;
    }),
  };
}
// Remove only product IDs supplied by this project. Orders and bills retain their
// own item snapshots, while owner-created listings use independent IDs.
export function removeStarterListings(current) {
  if (current.ownerCatalogueRevision === 1) return current;
  const supplied = new Set(seedStore().products.map((product) => product.id));
  const legacy = JSON.parse(readFileSync(new URL("./seed/legacy-signatures.json", import.meta.url), "utf8"));
  for (const product of legacy) supplied.add(product.id);
  return {
    ...current,
    ownerCatalogueRevision: 1,
    products: current.products.filter((product) => !supplied.has(product.id)),
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
    bills: current.bills ?? [],
    repairTickets: current.repairTickets ?? [],
    paymentConfig: current.paymentConfig ?? { qrImage: "", instructions: "", accountName: "" },
  };
  if (
    !Array.isArray(current.customers) ||
    !Array.isArray(current.customerSessions) ||
    !Array.isArray(current.staffAccounts)
  )
    throw new Error("Invalid customer store.");
  if (!Array.isArray(current.emailQueue))
    throw new Error("Invalid email queue in store file.");
  if (!Array.isArray(current.bills) || !Array.isArray(current.repairTickets))
    throw new Error("Invalid billing or repair ticket store.");
  return current;
}
export function createStore(
  file,
  { initialProducts, migrateStarter = true } = {},
) {
  let current = existsSync(file)
    ? normalizeStore(JSON.parse(readFileSync(file, "utf8")))
    : seedStore(initialProducts ?? (migrateStarter ? [] : undefined));
  const previous = current;
  if (migrateStarter)
    current = removeStarterListings(upgradeStarterStock(upgradeStarterCatalogue(current)));
  current = upgradePhoneCatalogue(current);
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
