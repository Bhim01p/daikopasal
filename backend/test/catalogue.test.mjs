import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, scryptSync } from "node:crypto";
import { createApp } from "../server.mjs";

test("real inventory import validates before replacing samples, preserves receipts and real stock, and backs up atomically", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-inventory-test-"));
  const file = path.join(directory, "store.json");
  const backupDirectory = path.join(directory, "catalogue-backups");
  const salt = "0123456789abcdef0123456789abcdef";
  const password = "inventory-test-password";
  const app = createApp({
    dataFile: file,
    username: "inventoryadmin",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    emailTransport: null,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  let cookie;
  async function request(
    route,
    method = "GET",
    input,
    admin = false,
    headers = {},
  ) {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(input ? { "Content-Type": "application/json" } : {}),
        ...(admin ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
  const catalogue = async () => (await request("/api/products")).data.products;
  try {
    for (const route of [
      "/api/admin/catalogue/preview",
      "/api/admin/catalogue/replace-samples",
    ])
      assert.equal(
        (await request(route, "POST", { products: [] })).status,
        401,
      );
    const login = await request("/api/admin/login", "POST", {
      username: "inventoryadmin",
      password,
    });
    cookie = login.headers.get("set-cookie").split(";")[0];
    const sample = (await catalogue())[0];
    const real = (
      await request(
        "/api/admin/products",
        "POST",
        {
          ...sample,
          name: "Existing real phone",
          isSample: false,
          stockQuantity: 4,
        },
        true,
      )
    ).data.product;
    const products = [
      {
        ...sample,
        name: "Imported phone",
        isSample: false,
        stockQuantity: 3,
        image: undefined,
      },
    ];
    assert.equal(
      (
        await request(
          "/api/admin/catalogue/preview",
          "POST",
          { products },
          true,
          { Origin: "https://other.example" },
        )
      ).status,
      403,
    );
    for (const input of [
      { products: [] },
      { products: [products[0], products[0]] },
      { products: [{ ...products[0], stockQuantity: null }] },
      { products: [{ ...products[0], isSample: true }] },
      { products: [real] },
    ])
      assert.equal(
        (await request("/api/admin/catalogue/preview", "POST", input, true))
          .status,
        400,
      );
    const preview = await request(
      "/api/admin/catalogue/preview",
      "POST",
      { products },
      true,
    );
    assert.equal(preview.status, 200);
    assert.equal(preview.data.sampleCount, 33);
    assert.equal(preview.data.preservedCount, 1);
    assert.equal(preview.data.products[0].image, "/assets/phone.svg");
    assert.equal(
      (await catalogue()).length,
      34,
      "Preview must not change listings",
    );
    assert.equal(existsSync(backupDirectory), false);
    const placed = await request("/api/orders", "POST", {
      name: "Receipt Customer",
      phone: "9806600444",
      email: "receipt@example.com",
      items: [{ productId: sample.id, quantity: 1 }],
      expectedTotal: sample.price,
      requestId: randomUUID(),
    });
    assert.equal(placed.status, 201);
    assert.equal(
      (
        await request(
          "/api/admin/catalogue/replace-samples",
          "POST",
          { products, catalogueVersion: preview.data.catalogueVersion },
          true,
        )
      ).status,
      409,
      "New reservations invalidate the earlier import preview",
    );
    assert.equal(existsSync(backupDirectory), false);
    const latest = await request(
      "/api/admin/catalogue/preview",
      "POST",
      { products },
      true,
    );
    const imported = await request(
      "/api/admin/catalogue/replace-samples",
      "POST",
      { products, catalogueVersion: latest.data.catalogueVersion },
      true,
    );
    assert.equal(imported.status, 200);
    assert.equal(imported.data.imported, 1);
    assert.equal(imported.data.removedSamples, 33);
    const live = await catalogue();
    assert.equal(live.length, 2);
    assert.ok(live.every((product) => product.isSample === false));
    assert.deepEqual(
      live.find((product) => product.id === real.id),
      real,
      "Existing real product IDs and quantities stay unchanged",
    );
    assert.equal(
      live.find((product) => product.name === "Imported phone").stockQuantity,
      3,
    );
    const backupFiles = readdirSync(backupDirectory);
    assert.equal(backupFiles.length, 1);
    const backup = JSON.parse(
      readFileSync(path.join(backupDirectory, backupFiles[0]), "utf8"),
    );
    assert.equal(backup.products.length, 34);
    assert.equal(backup.orders[0].id, placed.data.order.id);
    const receipt = await request(
      `/api/orders/${placed.data.order.id}`,
      "GET",
      undefined,
      false,
      { "X-Order-Token": placed.data.order.receiptToken },
    );
    assert.equal(receipt.status, 200);
    assert.equal(receipt.data.order.items[0].product.name, sample.name);
    assert.equal(
      (
        await request(
          `/api/admin/orders/${placed.data.order.id}`,
          "PATCH",
          { status: "Cancelled" },
          true,
        )
      ).status,
      200,
    );
    assert.equal(
      (await catalogue()).length,
      2,
      "Cancelling a removed sample must not recreate it",
    );
    assert.equal(
      (
        await request(
          "/api/admin/catalogue/replace-samples",
          "POST",
          { products, catalogueVersion: latest.data.catalogueVersion },
          true,
        )
      ).status,
      400,
    );
    assert.equal(
      readdirSync(backupDirectory).length,
      1,
      "Retries do not produce a second replacement",
    );
  } finally {
    await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
