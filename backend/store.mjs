import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function seedStore() {
  const products = JSON.parse(
    readFileSync(new URL("./seed/products.json", import.meta.url), "utf8"),
  );
  return normalizeStore({ products, orders: [] });
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
export function createStore(file) {
  let current = existsSync(file)
    ? normalizeStore(JSON.parse(readFileSync(file, "utf8")))
    : seedStore();
  function commit(next) {
    mkdirSync(path.dirname(file), { recursive: true });
    const temporary = file + ".tmp";
    writeFileSync(temporary, JSON.stringify(next, null, 2) + "\n", {
      mode: 0o600,
    });
    renameSync(temporary, file);
    current = next;
  }
  if (!existsSync(file)) commit(current);
  return { read: () => current, commit };
}
export const defaultStorePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data/store.json",
);
