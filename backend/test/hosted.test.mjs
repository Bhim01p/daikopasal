import { test } from "node:test";
import assert from "node:assert/strict";
import cron from "../../api/cron.mjs";
import { getHostedApp } from "../hosted-app.mjs";
import { createEmailWorker, createOrderEmail } from "../email.mjs";

test("scheduled email endpoint rejects missing/wrong secrets and non-GET requests before accessing the database", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";
  try {
    for (const request of [
      { method: "POST", headers: {} },
      { method: "GET", headers: {} },
      { method: "GET", headers: { authorization: "Bearer wrong" } },
    ]) {
      const headers = {};
      let body;
      const response = {
        setHeader: (name, value) => {
          headers[name] = value;
        },
        end: (value) => {
          body = JSON.parse(value);
        },
      };
      await cron(request, response);
      assert.equal(response.statusCode, request.method === "POST" ? 405 : 401);
      assert.equal(headers["Cache-Control"], "no-store");
      assert.equal(body.ok, undefined);
    }
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("hosted initialization refuses development OTP settings", () => {
  const mode = process.env.CUSTOMER_AUTH_MODE;
  const url = process.env.DATABASE_URL;
  process.env.CUSTOMER_AUTH_MODE = "development";
  process.env.DATABASE_URL = "postgresql://unused.invalid/test";
  try {
    assert.throws(() => getHostedApp(), /Development login/);
  } finally {
    for (const [key, value] of [
      ["CUSTOMER_AUTH_MODE", mode],
      ["DATABASE_URL", url],
    ])
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});

test("serverless email batches stop at the job limit and keep remaining messages queued", async () => {
  const jobs = Array.from({ length: 3 }, (_, i) =>
    createOrderEmail({
      id: `batch-${i}`,
      name: "Batch Test",
      email: "test@example.com",
      status: "Confirmed",
      items: [
        {
          quantity: 1,
          product: {
            name: "Phone",
            brand: "Test",
            price: 100,
            isSample: false,
          },
        },
      ],
      total: 100,
    }),
  );
  let data = { emailQueue: jobs };
  const store = {
    read: () => data,
    commit: (next) => {
      data = next;
    },
  };
  const worker = createEmailWorker(
    store,
    { from: "test@example.com", send: async (_, id) => id },
    { automatic: false },
  );
  try {
    await worker.drain({ maxJobs: 1 });
    assert.equal(
      data.emailQueue.filter((j) => j.state === "accepted").length,
      1,
    );
    assert.equal(data.emailQueue.filter((j) => j.state === "queued").length, 2);
    await worker.drain({ maxJobs: 5 });
    assert.equal(
      data.emailQueue.filter((j) => j.state === "accepted").length,
      3,
    );
  } finally {
    worker.stop();
  }
});
