import test from "node:test";
import assert from "node:assert/strict";
import { issueBill, billPdf } from "../billing.mjs";
import { seedStore } from "./app-fixture.mjs";
import { validateProduct } from "../validation.mjs";

test("used-phone inspection keeps unknown checks explicit and rejects invented statuses", () => {
  const existing = seedStore().products.find(
    (item) => item.category === "used",
  );
  const input = {
    ...existing,
    images: [existing.image],
    inspection: {
      checks: { screen: "passed", charging: "issue" },
      defects: "Charging port needs inspection",
      included: "Phone only",
    },
  };
  const checked = validateProduct(input, existing);
  assert.equal(checked.inspection.checks.screen, "passed");
  assert.equal(checked.inspection.checks.cameras, "not_checked");
  assert.equal(checked.inspection.checks.charging, "issue");
  assert.equal(checked.inspection.defects, "Charging port needs inspection");
  assert.throws(
    () =>
      validateProduct(
        {
          ...input,
          inspection: { ...input.inspection, checks: { screen: "perfect" } },
        },
        existing,
      ),
    { status: 400 },
  );
});

test("walk-in bill deducts once; retries return an immutable receipt; website bill uses reserved order stock", async () => {
  let current = seedStore();
  const product = current.products.find(
    (item) => item.available && !item.priceIsEstimate,
  );
  const store = {
    read: () => current,
    commit: (next) => {
      current = next;
    },
  };
  const actor = { username: "cashier" };
  const initialQuantity = product.stockQuantity;
  const input = {
    requestId: "fixed-request-123456",
    customerName: "Walk In",
    customerPhone: "",
    items: [{ productId: product.id, quantity: 1 }],
  };
  const first = issueBill(store, input, actor);
  assert.equal(first.total, product.price);
  assert.equal(first.taxStatus, "pending");
  assert.equal(
    store.read().products.find((item) => item.id === product.id).stockQuantity,
    initialQuantity - 1,
  );
  assert.equal(issueBill(store, input, actor).id, first.id);
  assert.equal(
    store.read().products.find((item) => item.id === product.id).stockQuantity,
    initialQuantity - 1,
  );
  assert.throws(
    () => issueBill(store, { ...input, customerName: "Changed" }, actor),
    { status: 409 },
  );
  const pdf = await billPdf(first);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");

  const order = {
    id: "ME-TEST-ORDER",
    status: "Completed",
    name: "Online Buyer",
    phone: "9806600444",
    items: [{ product, quantity: 1 }],
  };
  store.commit({ ...store.read(), orders: [order] });
  const before = store
    .read()
    .products.find((item) => item.id === product.id).stockQuantity;
  const online = issueBill(store, { orderId: order.id }, actor);
  assert.equal(online.orderId, order.id);
  assert.equal(issueBill(store, { orderId: order.id }, actor).id, online.id);
  assert.equal(
    store.read().products.find((item) => item.id === product.id).stockQuantity,
    before,
  );
  assert.equal(online.lines[0].unitPrice, product.price);
});
