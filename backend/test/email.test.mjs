import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, scryptSync } from "node:crypto";
import { createApp } from "../server.mjs";
import { createStore } from "../store.mjs";
import {
  createOrderEmail,
  createEmailTransport,
  createEmailWorker,
} from "../email.mjs";

const order = {
  id: "ME-EMAIL-TEST",
  name: "Customer <script>alert('x')</script>",
  email: "customer@example.com",
  note: "<img src=x onerror=alert(1)>",
  status: "Awaiting shop confirmation",
  total: 1000,
  items: [
    {
      product: {
        name: "Phone <b>sample</b>",
        brand: "Test",
        price: 1000,
        isSample: true,
      },
      quantity: 1,
    },
  ],
};

test("email content distinguishes order received from pickup ready and escapes customer input", () => {
  assert.equal(createOrderEmail({ ...order, email: undefined }), null);
  const received = createOrderEmail(order, "received");
  assert.match(received.message.subject, /Order received/);
  assert.match(received.message.text, /still needs to confirm/);
  assert.match(received.message.text, /Sample total: Rs. 1,000/);
  assert.match(received.message.text, /No online payment has been taken/);
  assert.ok(!received.message.html.includes("<script>"));
  assert.ok(!received.message.html.includes("<img src=x"));
  assert.match(received.message.html, /&lt;script&gt;/);
  const ready = createOrderEmail({ ...order, status: "Ready for pickup" });
  assert.match(ready.message.text, /ready to collect/);
  assert.match(ready.message.subject, /Ready for pickup/);
  const real = createOrderEmail({
    ...order,
    items: [
      {
        ...order.items[0],
        product: { ...order.items[0].product, isSample: false },
      },
    ],
  });
  assert.ok(!real.message.text.includes("Sample total"));
});

test("persistent email queue retries stable content and identifiers without losing concurrent status updates", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-email-test-"));
  const file = path.join(directory, "store.json");
  const store = createStore(file);
  const received = createOrderEmail(order, "received");
  const ready = createOrderEmail({ ...order, status: "Ready for pickup" });
  store.commit({ ...store.read(), orders: [order], emailQueue: [received] });
  let time = 1000000;
  let calls = [];
  const failing = createEmailWorker(
    store,
    {
      from: "Shop <orders@example.com>",
      async send(message, id) {
        calls.push({ message, id });
        // Simulate another status update while an email is being sent.
        store.commit({
          ...store.read(),
          emailQueue: [...store.read().emailQueue, ready],
        });
        throw new Error("Network failure");
      },
    },
    { now: () => time },
  );
  try {
    await failing.drain();
    assert.equal(
      calls.length,
      1,
      "Later updates must wait behind an earlier queued email",
    );
    assert.equal(store.read().emailQueue[0].state, "queued");
    assert.equal(store.read().emailQueue.length, 2);
    failing.stop();
    const restarted = createStore(file);
    time += 60001;
    const worker = createEmailWorker(
      restarted,
      {
        from: "Changed <other@example.com>",
        async send(message, id) {
          calls.push({ message, id });
          return `provider-${id}`;
        },
      },
      { now: () => time },
    );
    try {
      await worker.drain();
      assert.equal(calls.length, 3);
      assert.equal(calls[0].id, calls[1].id);
      assert.deepEqual(
        calls[0].message,
        calls[1].message,
        "Retries must retain their original sender and payload",
      );
      assert.ok(
        restarted.read().emailQueue.every((job) => job.state === "accepted"),
      );
      await worker.drain();
      assert.equal(calls.length, 3, "Accepted emails must not be sent again");
      const disabled = createEmailWorker(restarted, null);
      disabled.stop();
      assert.equal(disabled.configured, false);
    } finally {
      worker.stop();
    }
  } finally {
    failing.stop();
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});

test("email worker stops retrying before the provider duplicate-prevention key expires", async () => {
  let calls = 0;
  let current = {
    emailQueue: [
      { ...createOrderEmail(order), firstAttemptAt: 1000, attempts: 1 },
    ],
  };
  const store = {
    read: () => current,
    commit: (next) => {
      current = next;
    },
  };
  const worker = createEmailWorker(
    store,
    {
      from: "orders@example.com",
      send: async () => {
        calls++;
      },
    },
    { now: () => 1000 + 23 * 3600000 },
  );
  try {
    await worker.drain();
    assert.equal(calls, 0);
    assert.equal(current.emailQueue[0].state, "failed");
  } finally {
    worker.stop();
  }
});

test("Resend adapter uses authenticated HTTPS and a stable idempotency key; disabled mode does not send", async () => {
  assert.equal(createEmailTransport({ EMAIL_PROVIDER: "disabled" }), null);
  assert.equal(createEmailTransport({ EMAIL_PROVIDER: "resend" }), null);
  const transport = createEmailTransport(
    {
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "test-key",
      EMAIL_FROM: "orders@example.com",
    },
    async (url, options) => {
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(options.headers.Authorization, "Bearer test-key");
      assert.equal(options.headers["Idempotency-Key"], "order-email/job-123");
      assert.equal(JSON.parse(options.body).to[0], order.email);
      return { ok: true, json: async () => ({ id: "provider-123" }) };
    },
  );
  assert.equal(
    await transport.send(createOrderEmail(order).message, "job-123"),
    "provider-123",
  );
});

test("orders remain saved after sending fails; admin status changes and authenticated retry reach the email worker", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-email-api-test-"));
  const salt = "0123456789abcdef0123456789abcdef";
  const password = "email-test-only";
  const calls = [];
  let reject = true;
  const app = createApp({
    dataFile: path.join(directory, "store.json"),
    username: "testadmin",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    emailTransport: {
      from: "orders@example.com",
      async send(message, id) {
        calls.push({ message, id });
        if (reject) {
          const error = new Error("Email service rejected the sender.");
          error.permanent = true;
          throw error;
        }
        return `provider-${id}`;
      },
    },
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  let cookie = "";
  const request = async (route, method = "GET", input) => {
    const response = await fetch(base + route, {
      method,
      headers: {
        Cookie: cookie,
        ...(input ? { "Content-Type": "application/json" } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json(),
    };
  };
  async function waitForState(orderId, state, index = 0) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const result = await request("/api/admin/orders");
      const target = result.body.orders.find((order) => order.id === orderId);
      if (target.emailNotifications[index]?.state === state) return target;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail(`Email did not reach ${state}`);
  }
  try {
    const login = await request("/api/admin/login", "POST", {
      username: "testadmin",
      password,
    });
    cookie = login.headers.get("set-cookie").split(";")[0];
    const products = (await request("/api/products")).body.products;
    const product = products.find((p) => p.available);
    const input = {
      name: "Email Test",
      phone: "9806600444",
      email: "customer@example.com",
      items: [{ productId: product.id, quantity: 1 }],
      expectedTotal: product.price,
      requestId: randomUUID(),
    };
    const placed = await request("/api/orders", "POST", input);
    assert.equal(
      placed.status,
      201,
      "Email failure must not fail order creation",
    );
    const id = placed.body.order.id;
    const failed = await waitForState(id, "failed");
    assert.equal(failed.status, "Awaiting shop confirmation");
    const repeated = await request("/api/orders", "POST", input);
    assert.equal(repeated.status, 200);
    assert.equal(calls.length, 1);
    reject = false;
    const changed = await request(`/api/admin/orders/${id}`, "PATCH", {
      status: "Ready for pickup",
    });
    assert.equal(changed.status, 200);
    const accepted = await waitForState(id, "accepted", 1);
    assert.equal(accepted.status, "Ready for pickup");
    assert.match(calls[1].message.subject, /Ready for pickup/);
    const retry = await request(
      `/api/admin/emails/${failed.emailNotifications[0].id}/retry`,
      "POST",
      {},
    );
    assert.equal(retry.status, 200);
    await waitForState(id, "accepted");
    assert.equal(calls[0].id, calls[2].id);
    assert.deepEqual(calls[0].message, calls[2].message);
    assert.equal(
      (
        await request(
          `/api/admin/emails/${failed.emailNotifications[0].id}/retry`,
          "POST",
          {},
        )
      ).status,
      409,
    );
    await request(`/api/admin/orders/${id}`, "PATCH", {
      status: "Ready for pickup",
    });
    assert.equal(
      calls.length,
      3,
      "Repeated status must not send another update",
    );
    for (let i = 0; i < 4; i++)
      assert.equal(
        (
          await request("/api/orders", "POST", {
            ...input,
            requestId: randomUUID(),
          })
        ).status,
        201,
      );
    assert.equal(
      (
        await request("/api/orders", "POST", {
          ...input,
          requestId: randomUUID(),
        })
      ).status,
      429,
      "Recipient order-email rate limit should bound guest notifications",
    );
    assert.equal(
      (await request("/api/orders", "POST", input)).status,
      200,
      "Idempotent checkout retry must work after the recipient limit is reached",
    );
  } finally {
    await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
