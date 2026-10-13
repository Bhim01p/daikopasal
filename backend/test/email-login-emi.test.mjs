import { test } from "node:test";
import assert from "node:assert/strict";
import { createCustomerAuth } from "../customer-auth.mjs";
import { seedStore, upgradeStarterCatalogue } from "../store.mjs";
import { calculateEmi } from "../../shared/emi.mjs";
import { validateProduct } from "../validation.mjs";
import { readFileSync } from "node:fs";
const request = {
  headers: { host: "localhost" },
  socket: { remoteAddress: "127.0.0.1" },
};
function memory() {
  let data = seedStore();
  return {
    read: () => data,
    commit: (next) => {
      data = next;
    },
  };
}
test("email codes hide OTPs, verify existing accounts, preserve order ownership and lock the verified address", async () => {
  const store = memory();
  const customer = {
    id: "existing-customer",
    phone: "+9779806600444",
    name: "Existing",
    email: "owner@example.com",
    verifiedVia: "sms",
  };
  store.commit({
    ...store.read(),
    customers: [customer],
    orders: [{ id: "old-order", customerId: customer.id }],
  });
  let message;
  const auth = createCustomerAuth(store, {
    mode: "email",
    emailTransport: {
      from: "shop@example.com",
      send: async (msg) => {
        message = msg;
      },
    },
  });
  const result = await auth.start(request, { email: " OWNER@example.com " });
  assert.equal(result.mode, "email");
  assert.equal(result.developmentCode, undefined);
  assert.equal(
    JSON.stringify(result).includes(message.text.match(/\d{6}/)[0]),
    false,
  );
  await assert.rejects(auth.start(request, { email: "owner@example.com" }), {
    status: 429,
  });
  assert.throws(
    () =>
      auth.verify(
        request,
        { setHeader() {} },
        { challengeId: result.challengeId, code: "000000" },
      ),
    { status: 400 },
  );
  let cookie;
  const signed = auth.verify(
    request,
    {
      setHeader: (key, value) => {
        cookie = value.split(";")[0];
      },
    },
    { challengeId: result.challengeId, code: message.text.match(/\d{6}/)[0] },
  );
  assert.equal(signed.id, customer.id);
  assert.equal(store.read().orders[0].customerId, signed.id);
  const sessionRequest = {
    ...request,
    headers: { ...request.headers, cookie },
  };
  assert.equal(auth.session(sessionRequest).customer.id, customer.id);
  assert.throws(
    () =>
      auth.updateProfile(sessionRequest, {
        name: "Updated",
        phone: "9846692687",
        email: "attacker@example.com",
      }),
    { status: 400 },
  );
  assert.equal(
    auth.updateProfile(sessionRequest, {
      name: "Updated",
      phone: "9846692687",
      email: "owner@example.com",
    }).phone,
    "+9779846692687",
  );
  assert.throws(
    () =>
      auth.verify(
        request,
        { setHeader() {} },
        {
          challengeId: result.challengeId,
          code: message.text.match(/\d{6}/)[0],
        },
      ),
    { status: 400 },
  );
});
test("email login handles expiry, send failure, ambiguous legacy emails, and incomplete profiles", async () => {
  let now = Date.now(),
    message;
  const store = memory();
  const options = {
    mode: "email",
    now: () => now,
    emailTransport: {
      send: async (msg) => {
        message = msg;
      },
    },
  };
  const auth = createCustomerAuth(store, options);
  let result = await auth.start(request, { email: "new@example.com" });
  now += 300001;
  assert.throws(
    () =>
      auth.verify(
        request,
        { setHeader() {} },
        {
          challengeId: result.challengeId,
          code: message.text.match(/\d{6}/)[0],
        },
      ),
    { status: 400 },
  );
  result = await auth.start(request, { email: "new@example.com" });
  const fresh = auth.verify(
    request,
    { setHeader() {} },
    { challengeId: result.challengeId, code: message.text.match(/\d{6}/)[0] },
  );
  assert.equal(fresh.email, "new@example.com");
  assert.equal(fresh.profileComplete, false);
  const failed = createCustomerAuth(memory(), {
    mode: "email",
    emailTransport: {
      send: async () => {
        throw new Error("private provider secret");
      },
    },
  });
  await assert.rejects(
    failed.start(request, { email: "new@example.com" }),
    (error) => error.status === 503 && !error.message.includes("secret"),
  );
  store.commit({
    ...store.read(),
    customers: [
      { id: "1", email: "duplicate@example.com" },
      { id: "2", email: "duplicate@example.com" },
    ],
  });
  result = await auth.start(request, { email: "duplicate@example.com" });
  assert.throws(
    () =>
      auth.verify(
        request,
        { setHeader() {} },
        {
          challengeId: result.challengeId,
          code: message.text.match(/\d{6}/)[0],
        },
      ),
    { status: 409 },
  );
  assert.equal(
    createCustomerAuth(memory(), { mode: "email", emailTransport: null }).mode(
      request,
    ),
    "disabled",
  );
});
test("EMI math covers zero interest, reducing balance, flat interest, upfront fees and invalid inputs", () => {
  assert.equal(calculateEmi(60000, 12000, 0, 12).monthly, 4000);
  const reducing = calculateEmi(60000, 12000, 12, 12, 500);
  assert.ok(Math.abs(reducing.monthly - 4264.74) < 0.01);
  assert.ok(Math.abs(reducing.total - (reducing.monthly * 12 + 12500)) < 0.001);
  const flat = calculateEmi(60000, 12000, 12, 12, 500, "flat");
  assert.ok(Math.abs(flat.monthly - 4480) < 1e-8);
  assert.equal(flat.upfront, 12500);
  assert.ok(Math.abs(flat.total - 66260) < 1e-8);
  for (const args of [
    [0, 0, 0, 12],
    [100, 100, 0, 12],
    [100, -1, 0, 12],
    [100, 0, -1, 12],
    [100, 0, 0, 0],
    [100, 0, 0, 2.5],
    [100, 0, 0, 12, -1],
  ])
    assert.throws(() => calculateEmi(...args));
  assert.ok(Number.isFinite(calculateEmi(100, 0, 1e-12, 12).monthly));
});
test("real starter migration removes untouched examples once and preserves edited products, receipts and accounts", () => {
  const legacy = JSON.parse(
    readFileSync(new URL("./fixtures/products.json", import.meta.url), "utf8"),
  );
  const edited = {
    ...legacy[0],
    id: "owner-product",
    isSample: false,
    name: "Owner inventory",
  };
  const current = {
    products: [...legacy, edited],
    orders: [{ id: "keep-receipt" }],
    customers: [{ id: "keep-account" }],
  };
  const next = upgradeStarterCatalogue(current);
  assert.equal(next.products.length, seedStore().products.length + 1);
  assert.ok(next.products.some((p) => p.id === "owner-product"));
  assert.ok(next.products.every((p) => p.isSample === false));
  assert.equal(next.orders, current.orders);
  assert.equal(next.customers, current.customers);
  assert.equal(next.previousStarterCatalogue.length, 33);
  assert.equal(upgradeStarterCatalogue(next), next);
  assert.ok(
    seedStore().products.every(
      (p) => p.priceIsEstimate === true && p.stockQuantity === 0,
    ),
  );
});
test("admin product validation persists source/variant and EMI terms; rejects unsafe URLs and invalid terms", () => {
  const phone = seedStore().products.find((p) => p.category === "new" && p.ram);
  const valid = validateProduct({
    ...phone,
    emi: {
      enabled: true,
      annualRate: 12,
      minimumDownPercent: 20,
      fee: 500,
      method: "reducing",
      months: [12, 6],
    },
  });
  assert.deepEqual(valid.emi.months, [6, 12]);
  assert.equal(valid.specSourceUrl, phone.specSourceUrl);
  assert.throws(
    () => validateProduct({ ...phone, specSourceUrl: "javascript:alert(1)" }),
    { status: 400 },
  );
  assert.throws(
    () => validateProduct({ ...phone, emi: { ...valid.emi, months: [] } }),
    { status: 400 },
  );
  assert.throws(
    () =>
      validateProduct({
        ...phone,
        emi: { ...valid.emi, annualRate: Infinity },
      }),
    { status: 400 },
  );
});

test("estimated catalogue prices remain labelled in order emails", async () => {
  const { createOrderEmail } = await import("../email.mjs");
  const product = seedStore().products[0];
  const job = createOrderEmail(
    {
      id: "estimate-order",
      name: "Customer",
      email: "customer@example.com",
      status: "Awaiting shop confirmation",
      items: [{ product, quantity: 1 }],
      total: product.price,
      note: "",
    },
    "received",
  );
  assert.match(job.message.text, /Estimated total/);
  assert.match(
    job.message.text,
    /Prices are estimates and require shop confirmation/,
  );
  assert.doesNotMatch(job.message.text, /Sample total/);
});
