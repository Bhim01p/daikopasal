import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parsePhoneCsv,
  phoneColumns,
  upgradePhoneCatalogue,
  publicReferencePhones,
} from "../phone-reference.mjs";
import { seedStore, upgradeStarterStock } from "../store.mjs";
import { createDatabaseStore } from "../database-store.mjs";
import { createApp } from "../server.mjs";

const source = readFileSync(
  new URL("../../data/phone-reference/phones-2026-10-13.csv", import.meta.url),
  "utf8",
);
const imported = parsePhoneCsv(source);
const encode = (row) =>
  row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
function csvWith(changes = {}) {
  const raw = { ...imported[0].raw, ...changes };
  return (
    phoneColumns.join(",") +
    "\r\n" +
    encode(phoneColumns.map((k) => raw[k])) +
    "\r\n"
  );
}

test("phone CSV retains 83 exact configurations, missing values and every source; handles RFC quoting", () => {
  assert.equal(imported.length, 83);
  assert.equal(new Set(imported.map((p) => p.brand + "|" + p.name)).size, 50);
  assert.equal(new Set(imported.map((p) => p.id)).size, 83);
  assert.ok(
    imported.every((p) => p.sourceUrls.length && p.checkedAt === "2026-10-13"),
  );
  assert.equal(imported[0].specs.GPU, undefined);
  assert.equal(imported[0].specs["Wireless charging"], undefined);
  const [quoted] = parsePhoneCsv(
    "\uFEFF" +
      csvWith({
        rear_camera_details: 'Main, "wide"\nSecond module',
        wireless_charging_w: "0",
      }),
  );
  assert.equal(quoted.specs["Rear camera"], 'Main, "wide"\nSecond module');
  assert.equal(quoted.specs["Wireless charging"], "No");
  assert.ok(quoted.sourceUrls.length > 1);
});

test("invalid imports reject duplicates, unsafe links, numeric/boolean/date errors and malformed CSV", () => {
  for (const change of [
    { ram_gb: "NaN" },
    { nfc: "unknown" },
    { source_urls: "javascript:alert(1)" },
    { source_urls: "" },
    { release_date: "2026-02-30" },
    { verified_at: "" },
  ])
    assert.throws(() => parsePhoneCsv(csvWith(change)));
  const line = encode(phoneColumns.map((k) => imported[0].raw[k]));
  assert.throws(
    () => parsePhoneCsv(phoneColumns.join(",") + "\n" + line + "\n" + line),
    /duplicate/,
  );
  assert.throws(
    () => parsePhoneCsv(source.replace("id,brand", "wrong,brand")),
    /columns/,
  );
  assert.throws(() => parsePhoneCsv(source + '\n"unfinished'), /quote/);
});

test("catalogue migration is idempotent, preserves custom references and leaves inventory/accounts/orders untouched", () => {
  const original = {
    ...seedStore(),
    orders: [{ id: "existing-receipt" }],
    customers: [{ id: "existing-customer" }],
    referencePhones: [{ id: "custom-reference", name: "Keep me" }],
  };
  const migrated = upgradePhoneCatalogue(original);
  assert.equal(migrated.referencePhones.length, 86);
  assert.strictEqual(migrated.products, original.products);
  assert.strictEqual(migrated.orders, original.orders);
  assert.strictEqual(migrated.customers, original.customers);
  assert.strictEqual(upgradePhoneCatalogue(migrated), migrated);
  assert.ok(
    publicReferencePhones(migrated).every(
      (p) => !("raw" in p) && !("price" in p),
    ),
  );
});

test("Neon transaction persists reference migration once and public API serves it without changing products", async () => {
  let saved = seedStore(),
    updates = 0;
  const sql = Object.assign(() => [], {
    json: (v) => v,
    begin: async (callback) => {
      const tx = Object.assign(
        (strings, ...values) => {
          if (typeof strings === "string") return strings;
          const query = strings.join("?");
          if (query.includes("select data")) return [{ data: saved }];
          if (query.includes("update ")) {
            saved = values[1];
            updates++;
          }
          return [];
        },
        { json: (v) => v },
      );
      return callback(tx);
    },
    end: async () => {},
  });
  const store = createDatabaseStore(null, { client: sql });
  await store.transaction(() =>
    assert.equal(store.read().referencePhones.length, 85),
  );
  await store.transaction(() =>
    assert.equal(publicReferencePhones(store.read()).length, 85),
  );
  assert.equal(updates, 1);
  const app = createApp({
    store,
    serverless: true,
    customerAuthMode: "disabled",
    emailTransport: null,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${app.address().port}`;
    const response = await fetch(base + "/api/reference-phones");
    assert.equal(response.status, 200);
    const { phones } = await response.json();
    assert.equal(phones.length, 85);
    assert.ok(phones.every((p) => !("raw" in p)));
    const { products } = await (await fetch(base + "/api/products")).json();
    assert.deepEqual(products, upgradeStarterStock(seedStore()).products);
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
});
