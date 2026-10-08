import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { scryptSync, randomUUID } from "node:crypto";
import { createApp } from "../server.mjs";

test("product galleries validate local images, preserve legacy cover edits, receipts and photos after restart", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-gallery-test-"));
  const salt = "0123456789abcdef0123456789abcdef";
  const password = "gallery-test-password";
  const options = {
    dataFile: path.join(directory, "store.json"),
    username: "galleryadmin",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    emailTransport: null,
  };
  let app, base, cookie;
  const request = async (
    route,
    method = "GET",
    input,
    admin = false,
    headers = {},
  ) => {
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
  };
  async function start() {
    app = createApp(options);
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${app.address().port}`;
    const login = await request("/api/admin/login", "POST", {
      username: "galleryadmin",
      password,
    });
    cookie = login.headers.get("set-cookie").split(";")[0];
  }
  const current = async (id) =>
    (await request("/api/products")).data.products.find(
      (product) => product.id === id,
    );
  try {
    await start();
    const source = (await request("/api/products")).data.products[0];
    const images = [source.image, "/assets/earbuds.svg", "/assets/charger.svg"];
    for (const gallery of [
      null,
      [],
      "not-an-array",
      [images[0], images[0]],
      ["/assets/cover.svg"],
      [images[0], "https://other.example/photo.jpg"],
      [images[0], "javascript:alert(1)"],
      [images[0], "/assets/../secret.png"],
      [
        images[0],
        "/assets/cover.svg",
        "/assets/charger.svg",
        "/assets/earbuds.svg",
        "/assets/speaker.svg",
        "/assets/bulb.svg",
        "/assets/photo.svg",
      ],
    ])
      assert.equal(
        (
          await request(
            "/api/admin/products",
            "POST",
            { ...source, images: gallery },
            true,
          )
        ).status,
        400,
      );
    const created = await request(
      "/api/admin/products",
      "POST",
      { ...source, name: "Gallery test phone", images },
      true,
    );
    assert.equal(created.status, 201);
    const product = created.data.product;
    assert.deepEqual(product.images, images);
    const placed = await request("/api/orders", "POST", {
      name: "Gallery Customer",
      phone: "9806600444",
      email: "gallery@example.com",
      items: [{ productId: product.id, quantity: 1 }],
      expectedTotal: product.price,
      requestId: randomUUID(),
    });
    assert.equal(placed.status, 201);
    const latest = await current(product.id);
    const changed = await request(
      `/api/admin/products/${product.id}`,
      "PATCH",
      { ...latest, image: "/assets/speaker.svg", images: undefined },
      true,
    );
    assert.equal(changed.status, 200);
    assert.deepEqual(changed.data.product.images, [
      "/assets/speaker.svg",
      ...images.slice(1),
    ]);
    const replacement = ["/assets/earbuds.svg", "/assets/speaker.svg"];
    const edited = await request(
      `/api/admin/products/${product.id}`,
      "PATCH",
      { ...changed.data.product, image: replacement[0], images: replacement },
      true,
    );
    assert.equal(edited.status, 200);
    const receipt = await request(
      `/api/orders/${placed.data.order.id}`,
      "GET",
      undefined,
      false,
      { "X-Order-Token": placed.data.order.receiptToken },
    );
    assert.deepEqual(
      receipt.data.order.items[0].product.images,
      images,
      "Orders preserve the original gallery and cover",
    );
    await new Promise((resolve) => app.close(resolve));
    await start();
    assert.deepEqual((await current(product.id)).images, replacement);
    assert.equal((await current(product.id)).image, replacement[0]);
  } finally {
    if (app?.listening) await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
