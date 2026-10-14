import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, scryptSync } from "node:crypto";
import { createApp } from "./app-fixture.mjs";
import { createStore } from "./app-fixture.mjs";

test("stock reservations are atomic, retries are safe, cancellation returns units once and closed orders stay closed", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-stock-test-"));
  const file = path.join(directory, "store.json");
  const password = "stock-test-password";
  const salt = "0123456789abcdef0123456789abcdef";
  const options = {
    dataFile: file,
    username: "stockadmin",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    emailTransport: null,
  };
  let app;
  let base;
  let cookie;
  async function request(route, method = "GET", input, admin = false) {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(input ? { "Content-Type": "application/json" } : {}),
        ...(admin ? { Cookie: cookie } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
  async function start() {
    app = createApp(options);
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${app.address().port}`;
    const login = await request("/api/admin/login", "POST", {
      username: "stockadmin",
      password,
    });
    cookie = login.headers.get("set-cookie").split(";")[0];
  }
  const catalogue = async () => (await request("/api/products")).data.products;
  const current = async (id) =>
    (await catalogue()).find((product) => product.id === id);
  const status = (id, value) =>
    request(`/api/admin/orders/${id}`, "PATCH", { status: value, ...(value === "Completed" ? { pickupReference: id } : {}) }, true);
  const orderBody = (items, total) => ({
    name: "Stock Customer",
    phone: "9806600444",
    email: `${randomUUID()}@example.com`,
    items,
    expectedTotal: total,
    requestId: randomUUID(),
  });
  try {
    await start();
    const source = (await catalogue())[0];
    for (const stockQuantity of [undefined, null, -1, 1.5, "2", 1000001])
      assert.equal(
        (
          await request(
            "/api/admin/products",
            "POST",
            { ...source, stockQuantity },
            true,
          )
        ).status,
        400,
      );
    const create = await request(
      "/api/admin/products",
      "POST",
      { ...source, name: "Two unit phone", stockQuantity: 2, isSample: false },
      true,
    );
    assert.equal(create.status, 201);
    const product = create.data.product;
    const other = (await catalogue()).find(
      (p) => p.id !== product.id && p.available,
    );
    const otherBefore = other.stockQuantity;
    const originalOrderCount = JSON.parse(readFileSync(file, "utf8")).orders
      .length;
    assert.equal(
      (
        await request(
          "/api/orders",
          "POST",
          orderBody(
            [{ productId: product.id, quantity: 3 }],
            product.price * 3,
          ),
        )
      ).status,
      409,
    );
    assert.equal((await current(product.id)).stockQuantity, 2);
    const mixed = orderBody(
      [
        { productId: other.id, quantity: 1 },
        { productId: product.id, quantity: 3 },
      ],
      other.price + product.price * 3,
    );
    assert.equal((await request("/api/orders", "POST", mixed)).status, 409);
    assert.equal(
      (await current(other.id)).stockQuantity,
      otherBefore,
      "A failed multi-product order must not reserve any item",
    );
    assert.equal(
      JSON.parse(readFileSync(file, "utf8")).orders.length,
      originalOrderCount,
    );
    const purchase = orderBody(
      [{ productId: product.id, quantity: 2 }],
      product.price * 2,
    );
    const placed = await request("/api/orders", "POST", purchase);
    assert.equal(placed.status, 201);
    const id = placed.data.order.id;
    assert.equal(
      placed.data.order.stockReserved,
      undefined,
      "Reservation bookkeeping is private",
    );
    assert.equal((await current(product.id)).stockQuantity, 0);
    assert.equal((await current(product.id)).available, false);
    assert.equal(
      (await request("/api/orders", "POST", purchase)).data.order.id,
      id,
    );
    assert.equal(
      (await current(product.id)).stockQuantity,
      0,
      "Retry must not reserve twice",
    );
    assert.equal(
      (
        await request(
          `/api/admin/products/${product.id}`,
          "PATCH",
          { ...product, price: product.price + 1 },
          true,
        )
      ).status,
      409,
      "An old admin form must not overwrite new reservations",
    );
    assert.equal((await status(id, "Confirmed")).status, 200);
    assert.equal((await current(product.id)).stockQuantity, 0);
    await new Promise((resolve) => app.close(resolve));
    await start();
    assert.equal((await current(product.id)).stockQuantity, 0);
    assert.equal((await status(id, "Cancelled")).status, 200);
    assert.equal(
      (await current(product.id)).stockQuantity,
      2,
      "Cancellation after restart must return reserved units",
    );
    assert.equal((await current(product.id)).available, true);
    const queueCount = JSON.parse(readFileSync(file, "utf8")).emailQueue.length;
    assert.equal((await status(id, "Cancelled")).status, 200);
    assert.equal((await current(product.id)).stockQuantity, 2);
    assert.equal(
      JSON.parse(readFileSync(file, "utf8")).emailQueue.length,
      queueCount,
    );
    assert.equal((await status(id, "Confirmed")).status, 409);
    assert.equal(
      (await request("/api/orders", "POST", purchase)).data.order.status,
      "Cancelled",
    );
    assert.equal((await current(product.id)).stockQuantity, 2);

    const now = await current(product.id);
    assert.equal(
      (
        await request(
          `/api/admin/products/${product.id}`,
          "PATCH",
          { ...now, stockQuantity: 1 },
          true,
        )
      ).status,
      200,
    );
    const contenders = await Promise.all(
      [1, 2].map(() =>
        request(
          "/api/orders",
          "POST",
          orderBody([{ productId: product.id, quantity: 1 }], product.price),
        ),
      ),
    );
    assert.deepEqual(
      contenders.map((r) => r.status).sort(),
      [201, 409],
      "Only one customer can reserve the last unit",
    );
    const winner = contenders.find((result) => result.status === 201).data
      .order;
    assert.equal((await current(product.id)).stockQuantity, 0);
    assert.equal((await status(winner.id, "Ready for pickup")).status, 200);
    assert.equal((await status(winner.id, "Completed")).status, 200);
    assert.equal(
      (await status(winner.id, "Cancelled")).status,
      409,
      "Collected products are not automatically returned to stock",
    );
    assert.equal((await current(product.id)).stockQuantity, 0);

    const deletedPurchase = await request(
      "/api/orders",
      "POST",
      orderBody([{ productId: other.id, quantity: 1 }], other.price),
    );
    assert.equal(deletedPurchase.status, 201);
    await request(`/api/admin/products/${other.id}`, "DELETE", undefined, true);
    assert.equal(
      (await status(deletedPurchase.data.order.id, "Cancelled")).status,
      200,
    );
    assert.equal(
      await current(other.id),
      undefined,
      "Cancellation must not recreate a deleted listing",
    );
  } finally {
    if (app?.listening) await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});

test("legacy real listings need counts; old orders never manufacture returned stock", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-stock-migration-"));
  const file = path.join(directory, "store.json");
  const seed = JSON.parse(
    readFileSync(new URL("./fixtures/products.json", import.meta.url), "utf8"),
  )[0];
  const legacyOrder = {
    id: "old-order",
    status: "Confirmed",
    date: new Date().toISOString(),
    name: "Legacy customer",
    phone: "9806600444",
    email: "legacy@example.com",
    items: [{ product: seed, quantity: 2 }],
    total: seed.price * 2,
  };
  writeFileSync(
    file,
    JSON.stringify({
      products: [{ ...seed, isSample: false }],
      orders: [legacyOrder],
    }),
  );
  const store = createStore(file);
  assert.equal(store.read().products[0].stockQuantity, null);
  assert.equal(store.read().products[0].available, false);
  const password = "migration-test";
  const salt = "0123456789abcdef0123456789abcdef";
  const app = createApp({
    dataFile: file,
    username: "migrationadmin",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    emailTransport: null,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  try {
    const login = await fetch(base + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "migrationadmin", password }),
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const response = await fetch(base + "/api/admin/orders/old-order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ status: "Cancelled" }),
    });
    assert.equal(response.status, 200);
    const updated = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(updated.products[0].stockQuantity, null);
    assert.equal(updated.orders[0].status, "Cancelled");
  } finally {
    await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
