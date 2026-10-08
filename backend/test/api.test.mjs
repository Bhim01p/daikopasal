import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { scryptSync, randomUUID } from "node:crypto";
import { createApp } from "../server.mjs";
test("admin authorization, product CRUD, server-priced orders, private receipts, and restart persistence", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-backend-test-"));
  const password = "test-password-only";
  const salt = "0123456789abcdef0123456789abcdef";
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  const options = {
    dataFile: path.join(directory, "store.json"),
    username: "testadmin",
    passwordHash,
    emailTransport: null,
  };
  let app = createApp(options);
  const start = async () => {
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${app.address().port}`;
  };
  let base = await start();
  let cookie = "";
  const request = async (
    route,
    method = "GET",
    input,
    authenticated = false,
    headers = {},
  ) => {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(input ? { "Content-Type": "application/json" } : {}),
        ...(authenticated ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      headers: response.headers,
      data: await response.json(),
    };
  };
  try {
    const catalogue = await request("/api/products");
    assert.equal(catalogue.status, 200);
    assert.equal(catalogue.data.products.length, 33);
    assert.equal((await request("/api/admin/orders")).status, 401);
    assert.equal(
      (await request("/api/admin/emails/example/retry", "POST", {})).status,
      401,
    );
    assert.equal(
      (await request("/api/admin/products", "POST", {})).status,
      401,
    );
    assert.equal(
      (
        await request(
          "/api/admin/login",
          "POST",
          { username: "testadmin", password },
          {},
          { Origin: "https://other.example" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/api/admin/login", "POST", {
          username: "testadmin",
          password: "wrong",
        })
      ).status,
      401,
    );
    const login = await request("/api/admin/login", "POST", {
      username: "testadmin",
      password,
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie").split(";")[0];
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    assert.match(login.headers.get("set-cookie"), /SameSite=Strict/);
    const photo = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
      "base64",
    );
    const upload = (data, headers = {}) =>
      fetch(base + "/api/admin/images", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "image/png", ...headers },
      });
    assert.equal((await upload(photo)).status, 401);
    assert.equal(
      (await upload(photo, { Cookie: cookie, Origin: "https://other.example" }))
        .status,
      403,
    );
    assert.equal(
      (await upload(Buffer.from("not a picture"), { Cookie: cookie })).status,
      400,
    );
    assert.equal(
      (await upload(photo, { Cookie: cookie, "Content-Type": "image/svg+xml" }))
        .status,
      415,
    );
    assert.equal(
      (await upload(Buffer.alloc(5 * 1024 * 1024 + 1), { Cookie: cookie }))
        .status,
      413,
    );
    const uploaded = await upload(photo, { Cookie: cookie });
    assert.equal(uploaded.status, 201);
    const image = (await uploaded.json()).image;
    const servedImage = await fetch(base + image);
    assert.equal(servedImage.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await servedImage.arrayBuffer()), photo);
    const source = {
      ...catalogue.data.products[0],
      name: "Test shop phone",
      brand: "Test",
      price: 12345,
      isSample: false,
      image,
    };
    const created = await request("/api/admin/products", "POST", source, true);
    assert.equal(created.status, 201);
    assert.equal(created.data.product.isSample, false);
    const product = created.data.product;
    const edited = await request(
      `/api/admin/products/${product.id}`,
      "PATCH",
      { ...product, price: 15000 },
      true,
    );
    assert.equal(edited.status, 200);
    assert.equal(
      (await request("/api/products")).data.products.find(
        (p) => p.id === product.id,
      ).price,
      15000,
    );
    const orderBody = {
      name: "Backend Test",
      phone: "9806600444",
      email: "customer@example.com",
      note: "Test pickup",
      items: [{ productId: product.id, quantity: 2, price: 1 }],
      expectedTotal: 30000,
      requestId: randomUUID(),
    };
    assert.equal(
      (await request("/api/orders", "POST", { ...orderBody, expectedTotal: 2 }))
        .status,
      409,
    );
    assert.equal(
      (await request("/api/orders", "POST", { ...orderBody, name: "" })).status,
      400,
    );
    for (const email of [
      undefined,
      "",
      "invalid",
      "customer@example.com\r\nBcc: victim@example.com",
    ]) {
      assert.equal(
        (await request("/api/orders", "POST", { ...orderBody, email })).status,
        400,
      );
    }
    const placed = await request("/api/orders", "POST", orderBody);
    assert.equal(placed.status, 201);
    const order = placed.data.order;
    assert.equal(order.total, 30000);
    assert.equal(order.items[0].product.price, 15000);
    assert.ok(order.receiptToken);
    assert.equal(order.email, "customer@example.com");
    const repeat = await request("/api/orders", "POST", orderBody);
    assert.equal(repeat.status, 200);
    assert.equal(repeat.data.order.id, order.id);
    assert.equal(
      (
        await request("/api/orders", "POST", {
          ...orderBody,
          note: "Changed note",
        })
      ).status,
      409,
    );
    assert.equal((await request(`/api/orders/${order.id}`)).status, 404);
    assert.equal(
      (
        await request(`/api/orders/${order.id}`, "GET", undefined, false, {
          "X-Order-Token": "wrong",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request(`/api/orders/${order.id}`, "GET", undefined, false, {
          "X-Order-Token": order.receiptToken,
        })
      ).status,
      200,
    );
    const list = await request("/api/admin/orders", "GET", undefined, true);
    assert.equal(list.data.orders.length, 1);
    assert.equal(list.data.orders[0].receiptToken, undefined);
    assert.equal(list.data.emailConfigured, false);
    assert.equal(
      list.data.orders[0].emailNotifications.length,
      1,
      "Repeated order submission must not create a second email",
    );
    assert.equal(list.data.orders[0].emailNotifications[0].state, "queued");
    assert.equal(
      (
        await request(
          `/api/admin/orders/${order.id}`,
          "PATCH",
          { status: "Unknown" },
          true,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          `/api/admin/orders/${order.id}`,
          "PATCH",
          { status: "Ready for pickup" },
          true,
        )
      ).status,
      200,
    );
    const changed = await request("/api/admin/orders", "GET", undefined, true);
    assert.equal(changed.data.orders[0].emailNotifications.length, 2);
    assert.equal(
      changed.data.orders[0].emailNotifications[1].orderStatus,
      "Ready for pickup",
    );
    await request(
      `/api/admin/orders/${order.id}`,
      "PATCH",
      { status: "Ready for pickup" },
      true,
    );
    assert.equal(
      (await request("/api/admin/orders", "GET", undefined, true)).data
        .orders[0].emailNotifications.length,
      2,
      "Saving the same status must not create another email",
    );
    const unavailable = await request(
      `/api/admin/products/${product.id}`,
      "PATCH",
      {
        ...(await request("/api/products")).data.products.find(
          (p) => p.id === product.id,
        ),
        price: 17000,
        stockQuantity: 0,
      },
      true,
    );
    assert.equal(unavailable.status, 200);
    assert.equal(
      (
        await request("/api/orders", "POST", {
          ...orderBody,
          requestId: randomUUID(),
          expectedTotal: 34000,
        })
      ).status,
      409,
    );
    await request(
      `/api/admin/products/${product.id}`,
      "DELETE",
      undefined,
      true,
    );
    const receipt = await request(
      `/api/orders/${order.id}`,
      "GET",
      undefined,
      false,
      { "X-Order-Token": order.receiptToken },
    );
    assert.equal(receipt.data.order.status, "Ready for pickup");
    assert.equal(receipt.data.order.items[0].product.price, 15000);
    await new Promise((resolve) => app.close(resolve));
    app = createApp(options);
    base = await start();
    const persistedPhoto = await fetch(base + image);
    assert.equal(persistedPhoto.status, 200);
    assert.deepEqual(Buffer.from(await persistedPhoto.arrayBuffer()), photo);
    assert.equal((await request("/api/products")).data.products.length, 33);
    const persisted = await request(
      `/api/orders/${order.id}`,
      "GET",
      undefined,
      false,
      { "X-Order-Token": order.receiptToken },
    );
    assert.equal(persisted.status, 200);
    assert.equal(persisted.data.order.total, 30000);
    assert.equal(persisted.data.order.status, "Ready for pickup");
    assert.equal(
      (await request("/api/admin/orders", "GET", undefined, true)).status,
      401,
      "Session should not survive restart",
    );
    const relogin = await request("/api/admin/login", "POST", {
      username: "testadmin",
      password,
    });
    cookie = relogin.headers.get("set-cookie").split(";")[0];
    const afterRestart = await request(
      "/api/admin/orders",
      "GET",
      undefined,
      true,
    );
    assert.equal(
      afterRestart.data.orders[0].emailNotifications.length,
      2,
      "Queued emails must survive restart",
    );
    await request("/api/admin/logout", "POST", {}, true);
    assert.equal(
      (await request("/api/admin/orders", "GET", undefined, true)).status,
      401,
    );
  } finally {
    await new Promise((resolve) => app.close(resolve));
    const absolute = path.resolve(directory);
    assert.ok(
      absolute.startsWith(path.resolve(os.tmpdir()) + path.sep) &&
        path.basename(absolute).startsWith("me-backend-test-"),
    );
    rmSync(absolute, { recursive: true, force: true });
  }
});
