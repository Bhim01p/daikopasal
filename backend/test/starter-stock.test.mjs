import { test } from "node:test";
import assert from "node:assert/strict";
import { seedStore, upgradeStarterStock } from "../store.mjs";

test("opening stock gives exactly one to untouched starter products once", () => {
  const original = seedStore();
  const upgraded = upgradeStarterStock(original);
  assert.equal(upgraded.products.length, 8);
  assert.ok(
    upgraded.products.every(
      (p) => p.stockQuantity === 1 && p.stockVersion === 1 && p.available,
    ),
  );
  assert.ok(original.products.every((p) => p.stockQuantity === 0));
  upgraded.products[0] = {
    ...upgraded.products[0],
    stockQuantity: 0,
    stockVersion: 2,
    available: false,
  };
  assert.strictEqual(upgradeStarterStock(upgraded), upgraded);
  assert.equal(upgradeStarterStock(upgraded).products[0].stockQuantity, 0);
});

test("opening stock preserves owner edits, existing orders, changed quantities and comparison references", () => {
  const original = seedStore();
  original.products[0].price += 1;
  original.products[1].stockVersion = 1;
  original.products[2].stockQuantity = 5;
  original.products[2].available = true;
  original.orders = [
    { id: "existing", items: [{ product: {id: original.products[3].id} }] },
  ];
  original.referencePhones = [{ id: "reference-only" }];
  original.products[4].descriptionNe = "पसलले दिएको विवरण";
  const upgraded = upgradeStarterStock(original);
  assert.strictEqual(upgraded.orders, original.orders);
  assert.strictEqual(upgraded.referencePhones, original.referencePhones);
  for (let i = 0; i < 5; i++)
    assert.strictEqual(upgraded.products[i], original.products[i]);
  assert.ok(upgraded.products.slice(5).every((p) => p.stockQuantity === 1));
});
