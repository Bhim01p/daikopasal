import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, scryptSync } from "node:crypto";
import { createApp } from "../server.mjs";
import http from "node:http";
import { normalizePhone } from "../customer-auth.mjs";

test("Nepal phone normalization preserves local 977 prefixes and only strips full country codes", () => {
  for (const local of ["9806600444", "9771234567", "9781234567"]) {
    for (const value of [
      local,
      `977${local}`,
      `+977${local}`,
      `+977 (${local.slice(0, 3)}) ${local.slice(3)}`,
    ])
      assert.equal(normalizePhone(value), `+977${local}`);
  }
  for (const invalid of [
    "977123456",
    "97712345678",
    "+9771234567",
    "+919806600444",
    "98066004440",
    "9606600444",
  ])
    assert.throws(() => normalizePhone(invalid), { status: 400 });
});

test("phone login, saved checkout details, private order ownership, multi-device sessions and restart persistence", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-customer-test-"));
  const file = path.join(directory, "store.json");
  let time = Date.now();
  const codes = new Map();
  const salt = "0123456789abcdef0123456789abcdef";
  const options = {
    dataFile: file,
    emailTransport: null,
    customerAuthMode: "sms",
    customerNow: () => time,
    username: "testadmin",
    passwordHash: `${salt}:${scryptSync("test-only", salt, 64).toString("hex")}`,
    smsTransport: {
      async sendOTP(phone, code) {
        codes.set(phone, code);
      },
    },
  };
  let app = createApp(options);
  let base;
  async function listen() {
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${app.address().port}`;
  }
  async function request(
    route,
    method = "GET",
    input,
    cookie = "",
    headers = {},
  ) {
    const response = await fetch(base + route, {
      method,
      headers: {
        Cookie: cookie,
        ...headers,
        ...(input ? { "Content-Type": "application/json" } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      headers: response.headers,
      data: await response.json(),
    };
  }
  async function login(phone) {
    const start = await request("/api/customer/auth/start", "POST", { phone });
    assert.equal(start.status, 200);
    assert.equal(start.data.developmentCode, undefined);
    const canonical = "+977" + phone.replace(/^(\+977|977)/, "");
    const result = await request("/api/customer/auth/verify", "POST", {
      challengeId: start.data.challengeId,
      code: codes.get(canonical),
    });
    assert.equal(result.status, 200);
    return {
      cookie: result.headers.get("set-cookie").split(";")[0],
      customer: result.data.customer,
      start,
    };
  }
  await listen();
  try {
    assert.equal((await request("/api/customer/orders")).status, 401);
    assert.equal(
      (
        await request("/api/customer/profile", "PATCH", {
          name: "A",
          email: "a@example.com",
        })
      ).status,
      401,
    );
    assert.equal(
      (await request("/api/customer/auth/start", "POST", { phone: "123" }))
        .status,
      400,
    );
    assert.equal(
      (
        await request(
          "/api/customer/auth/start",
          "POST",
          { phone: "9806600444" },
          "",
          { Origin: "https://other.example" },
        )
      ).status,
      403,
    );
    const started = await request("/api/customer/auth/start", "POST", {
      phone: "9806600444",
    });
    assert.equal(started.data.developmentCode, undefined);
    assert.equal(
      (
        await request("/api/customer/auth/start", "POST", {
          phone: "+9779806600444",
        })
      ).status,
      429,
    );
    const correct = codes.get("+9779806600444");
    const wrong = correct === "000000" ? "111111" : "000000";
    assert.equal(
      (
        await request("/api/customer/auth/verify", "POST", {
          challengeId: started.data.challengeId,
          code: wrong,
        })
      ).status,
      400,
    );
    const verified = await request("/api/customer/auth/verify", "POST", {
      challengeId: started.data.challengeId,
      code: correct,
    });
    const aliceCookie = verified.headers.get("set-cookie").split(";")[0];
    assert.match(
      verified.headers.get("set-cookie"),
      /HttpOnly; SameSite=Strict/,
    );
    assert.equal(verified.data.customer.phone, "+9779806600444");
    assert.equal(verified.data.customer.profileComplete, false);
    assert.equal(
      (
        await request("/api/customer/auth/verify", "POST", {
          challengeId: started.data.challengeId,
          code: correct,
        })
      ).status,
      400,
    );
    const product = (await request("/api/products")).data.products.find(
      (p) => p.available,
    );
    const order = {
      items: [{ productId: product.id, quantity: 1 }],
      expectedTotal: product.price,
      requestId: randomUUID(),
    };
    assert.equal(
      (await request("/api/orders", "POST", order, aliceCookie)).status,
      400,
    );
    assert.equal(
      (
        await request(
          "/api/customer/profile",
          "PATCH",
          { name: "Alice", email: "bad" },
          aliceCookie,
        )
      ).status,
      400,
    );
    const profile = await request(
      "/api/customer/profile",
      "PATCH",
      { name: "Alice Customer", email: "alice@example.com" },
      aliceCookie,
    );
    assert.equal(profile.data.customer.profileComplete, true);
    const placed = await request(
      "/api/orders",
      "POST",
      {
        ...order,
        name: "Forged name",
        phone: "9806600555",
        email: "other@example.com",
        customerId: "forged",
      },
      aliceCookie,
    );
    assert.equal(placed.status, 201);
    assert.equal(placed.data.order.name, "Alice Customer");
    assert.equal(placed.data.order.email, "alice@example.com");
    assert.equal(placed.data.order.phone, "+9779806600444");
    assert.equal(placed.data.order.receiptToken, undefined);
    assert.equal(placed.data.order.accountOrder, true);
    assert.equal(
      (await request("/api/customer/orders", "GET", undefined, aliceCookie))
        .data.orders.length,
      1,
    );
    const id = placed.data.order.id;
    assert.equal((await request(`/api/orders/${id}`)).status, 404);
    assert.equal(
      (await request(`/api/orders/${id}`, "GET", undefined, aliceCookie))
        .status,
      200,
    );
    const guestBody = {
      ...order,
      name: "Alice Customer",
      phone: "+9779806600444",
      email: "alice@example.com",
      requestId: randomUUID(),
    };
    const guest = await request("/api/orders", "POST", guestBody);
    assert.equal(guest.status, 201);
    assert.ok(guest.data.order.receiptToken);
    assert.equal(
      (await request("/api/customer/orders", "GET", undefined, aliceCookie))
        .data.orders.length,
      1,
      "Matching guest contact details must not claim the guest order",
    );
    assert.equal(
      (await request("/api/orders", "POST", guestBody, aliceCookie)).status,
      409,
      "A guest request reference cannot be reused to return an account receipt",
    );
    const bob = await login("9806600555");
    assert.equal(
      (await request("/api/customer/orders", "GET", undefined, bob.cookie)).data
        .orders.length,
      0,
    );
    assert.equal(
      (await request(`/api/orders/${id}`, "GET", undefined, bob.cookie)).status,
      404,
    );
    await request(
      "/api/customer/profile",
      "PATCH",
      {
        id: profile.data.customer.id,
        name: "Bob Customer",
        email: "bob@example.com",
        phone: "9806600444",
      },
      bob.cookie,
    );
    assert.equal(
      (await request("/api/customer/session", "GET", undefined, aliceCookie))
        .data.customer.name,
      "Alice Customer",
    );
    time += 61000;
    const aliceSecond = await login("9779806600444");
    assert.equal(aliceSecond.customer.id, profile.data.customer.id);
    assert.equal(
      (
        await request(
          "/api/customer/orders",
          "GET",
          undefined,
          aliceSecond.cookie,
        )
      ).data.orders[0].id,
      id,
    );
    const admin = await request("/api/admin/login", "POST", {
      username: "testadmin",
      password: "test-only",
    });
    const adminCookie = admin.headers.get("set-cookie").split(";")[0];
    await request(
      `/api/admin/orders/${id}`,
      "PATCH",
      { status: "Ready for pickup" },
      adminCookie,
    );
    const updated = await request(
      `/api/orders/${id}`,
      "GET",
      undefined,
      aliceSecond.cookie,
    );
    assert.equal(updated.data.order.status, "Ready for pickup");
    assert.equal(updated.data.order.history.length, 2);
    await new Promise((resolve) => app.close(resolve));
    app = createApp(options);
    await listen();
    assert.equal(
      (
        await request(
          "/api/customer/session",
          "GET",
          undefined,
          aliceSecond.cookie,
        )
      ).data.customer.name,
      "Alice Customer",
    );
    assert.equal(
      (
        await request(
          "/api/customer/orders",
          "GET",
          undefined,
          aliceSecond.cookie,
        )
      ).data.orders[0].status,
      "Ready for pickup",
    );
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.ok(
      !readFileSync(file, "utf8").includes(
        aliceSecond.cookie.slice("me_customer=".length),
      ),
      "Raw session cookies must not be persisted",
    );
    assert.equal(saved.customers.length, 2);
    await request("/api/customer/logout", "POST", {}, aliceCookie);
    assert.equal(
      (
        await request(
          "/api/orders",
          "POST",
          { accountOrder: true },
          aliceCookie,
        )
      ).status,
      401,
      "An expired account checkout must ask for login instead of creating a guest order",
    );
    assert.equal(
      (await request("/api/customer/orders", "GET", undefined, aliceCookie))
        .status,
      401,
    );
    assert.equal(
      (
        await request(
          "/api/customer/orders",
          "GET",
          undefined,
          aliceSecond.cookie,
        )
      ).status,
      200,
      "Logging out one device must not revoke another device",
    );
    time += 8 * 24 * 3600000;
    assert.equal(
      (
        await request(
          "/api/customer/orders",
          "GET",
          undefined,
          aliceSecond.cookie,
        )
      ).status,
      401,
    );
  } finally {
    await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});

test("local test codes are unavailable on a public host; codes expire and attempts are bounded", async () => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "me-customer-dev-test-"),
  );
  let time = Date.now();
  const app = createApp({
    dataFile: path.join(directory, "store.json"),
    emailTransport: null,
    customerAuthMode: "development",
    customerNow: () => time,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const request = async (route, body, host) => {
    if (host)
      return new Promise((resolve, reject) => {
        const connection = http.request(
          base + route,
          {
            method: "POST",
            headers: { Host: host, "Content-Type": "application/json" },
          },
          (response) => {
            let data = "";
            response.on("data", (chunk) => {
              data += chunk;
            });
            response.on("end", () =>
              resolve({ status: response.statusCode, data: JSON.parse(data) }),
            );
          },
        );
        connection.on("error", reject);
        connection.end(JSON.stringify(body));
      });
    const response = await fetch(base + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(host ? { Host: host } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    assert.equal(
      (
        await request(
          "/api/customer/auth/start",
          { phone: "9806600777" },
          "public.example",
        )
      ).status,
      503,
    );
    const first = await request("/api/customer/auth/start", {
      phone: "9806600777",
    });
    assert.match(first.data.developmentCode, /^\d{6}$/);
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await request("/api/customer/auth/verify", {
            challengeId: first.data.challengeId,
            code: first.data.developmentCode === "000000" ? "111111" : "000000",
          })
        ).status,
        400,
      );
    assert.equal(
      (
        await request("/api/customer/auth/verify", {
          challengeId: first.data.challengeId,
          code: first.data.developmentCode,
        })
      ).status,
      400,
    );
    time += 61000;
    const second = await request("/api/customer/auth/start", {
      phone: "9806600777",
    });
    time += 301000;
    assert.equal(
      (
        await request("/api/customer/auth/verify", {
          challengeId: second.data.challengeId,
          code: second.data.developmentCode,
        })
      ).status,
      400,
    );
  } finally {
    await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
