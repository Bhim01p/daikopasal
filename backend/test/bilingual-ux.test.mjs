import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, scryptSync } from "node:crypto";
import { createApp } from "./app-fixture.mjs";
import { normalizePhone } from "../customer-auth.mjs";
import { translate, normalizeDigits } from "../../shared/locale.mjs";
import { createOrderEmail } from "../email.mjs";
import dictionary from "../../shared/ne.json" with { type: "json" };
import uiKeys from "../../shared/ui-keys.json" with { type: "json" };

test("Nepali UI coverage, template errors and phone digit normalization", () => {
  assert.deepEqual(
    uiKeys.filter((key) => !dictionary[key]),
    [],
  );
  assert.equal(normalizePhone("९८०६६००४४४"), "+9779806600444");
  assert.equal(normalizePhone("+९७७ ९७७१२३४५६७"), "+9779771234567");
  assert.equal(normalizeDigits("१२३४५६"), "123456");
  assert.equal(
    translate("Resend in 12s", "ne"),
    "12 सेकेन्डपछि फेरि पठाउनुहोस्",
  );
  assert.equal(
    translate("Resend in {{v0}}s", "en", { v0: 12 }),
    "Resend in 12s",
  );
  assert.equal(
    translate("Add {{v0}} to cart", "ne", { v0: "iPhone 12" }),
    "iPhone 12 कार्टमा राख्नुहोस्",
  );
});

test("quick stock retains other details, rejects stale reservations and captures notification language", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-bilingual-"));
  const salt = "0123456789abcdef0123456789abcdef",
    password = "test-only-password";
  const app = createApp({
    dataFile: path.join(directory, "store.json"),
    username: "testadmin",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    emailTransport: null,
    customerAuthMode: "development",
    smsTransport: null,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  let cookie = "";
  async function request(route, method = "GET", input, admin = false) {
    const response = await fetch(base + "/api" + route, {
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
  try {
    const login = await request("/admin/login", "POST", {
      username: "testadmin",
      password,
    });
    cookie = login.headers.get("set-cookie").split(";")[0];
    const product = (await request("/products")).data.products[0];
    const route = `/admin/products/${product.id}/stock`;
    assert.equal(
      (
        await request(route, "PATCH", {
          stockQuantity: 4,
          stockVersion: product.stockVersion,
        })
      ).status,
      401,
    );
    for (const stockQuantity of [-1, 1.5, "3", 1000001])
      assert.equal(
        (
          await request(
            route,
            "PATCH",
            { stockQuantity, stockVersion: product.stockVersion },
            true,
          )
        ).status,
        400,
      );
    const updated = await request(
      route,
      "PATCH",
      { stockQuantity: 4, stockVersion: product.stockVersion },
      true,
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.data.product.name, product.name);
    assert.equal(updated.data.product.description, product.description);
    assert.equal(updated.data.product.stockVersion, product.stockVersion + 1);
    const order = await request("/orders", "POST", {
      name: "निशान परीक्षण",
      email: "bilingual@example.com",
      phone: "९८०६६००४४४",
      note: "परीक्षण मात्र",
      language: "ne",
      items: [{ productId: product.id, quantity: 1 }],
      expectedTotal: product.price,
      requestId: randomUUID(),
    });
    assert.equal(order.status, 201);
    assert.equal(order.data.order.language, "ne");
    assert.equal(order.data.order.phone, "9806600444");
    const mail = createOrderEmail(order.data.order, "received");
    assert.match(mail.message.subject, /अर्डर प्राप्त भयो/);
    assert.match(mail.message.html, /lang="ne"/);
    assert.match(mail.message.text, /निशान परीक्षण/);
    assert.equal(
      (
        await request(
          route,
          "PATCH",
          { stockQuantity: 9, stockVersion: updated.data.product.stockVersion },
          true,
        )
      ).status,
      409,
    );
    const current = (await request("/products")).data.products.find(
      (p) => p.id === product.id,
    );
    assert.equal(current.stockQuantity, 3);
    const edit = await request(
      `/admin/products/${product.id}`,
      "PATCH",
      { ...current, descriptionNe: "यो नेपाली विवरण हो।" },
      true,
    );
    assert.equal(edit.data.product.descriptionNe, "यो नेपाली विवरण हो।");
    const start = await request("/customer/auth/start", "POST", {
      phone: "९८०६६००४४५",
    });
    const nepaliCode = start.data.developmentCode.replace(
      /\d/g,
      (d) => "०१२३४५६७८९"[Number(d)],
    );
    const verify = await request("/customer/auth/verify", "POST", {
      challengeId: start.data.challengeId,
      code: nepaliCode,
    });
    assert.equal(verify.status, 200);
  } finally {
    await new Promise((resolve) => app.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});
