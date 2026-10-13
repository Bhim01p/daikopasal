import { readFileSync } from "node:fs";
import { createApp as realApp } from "../server.mjs";
import { createStore as realStore, seedStore as realSeed } from "../store.mjs";
const products = JSON.parse(
  readFileSync(new URL("./fixtures/products.json", import.meta.url), "utf8"),
);
export const seedStore = () => realSeed(products);
export const createStore = (file) =>
  realStore(file, { initialProducts: products, migrateStarter: false });
export const createApp = (options = {}) =>
  realApp({
    initialProducts: products,
    migrateStarter: false,
    emailTransport: null,
    ...options,
  });
