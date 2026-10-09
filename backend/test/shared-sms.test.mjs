import { test } from "node:test";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createApp } from "../server.mjs";
import { seedStore } from "../store.mjs";

test("SMS challenges, attempt limits and customer sessions work across separate hosted app instances", async () => {
  let data = seedStore();
  let tail = Promise.resolve();
  function sharedStore() {
    const context = new AsyncLocalStorage();
    return {
      read: () => context.getStore().data,
      commit: (next) => {
        context.getStore().data = next;
      },
      async transaction(callback) {
        const previous = tail;
        let release;
        tail = new Promise((resolve) => {
          release = resolve;
        });
        await previous;
        const snapshot = { data: structuredClone(data) };
        try {
          const result = await context.run(snapshot, callback);
          data = snapshot.data;
          return result;
        } finally {
          release();
        }
      },
    };
  }
  let code;
  const apps = [0, 1].map(() =>
    createApp({
      store: sharedStore(),
      serverless: true,
      emailTransport: null,
      customerAuthMode: "sms",
      smsTransport: {
        async sendOTP(phone, value) {
          code = value;
          return { accepted: true };
        },
      },
    }),
  );
  for (const app of apps)
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const request = async (instance, route, input, cookie) => {
    const response = await fetch(
      `http://127.0.0.1:${apps[instance].address().port}/api/customer/${route}`,
      {
        method: input ? "POST" : "GET",
        headers: {
          ...(input ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(input ? { body: JSON.stringify(input) } : {}),
      },
    );
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    const challenge = await request(0, "auth/start", { phone: "9806600888" });
    assert.equal(challenge.status, 200);
    assert.equal(challenge.body.developmentCode, undefined);
    assert.equal(
      (await request(1, "auth/start", { phone: "9806600888" })).status,
      429,
    );
    const validCode = code;
    const invalidCode = validCode === "111111" ? "222222" : "111111";
    assert.equal(
      (
        await request(1, "auth/verify", {
          challengeId: challenge.body.challengeId,
          code: invalidCode,
        })
      ).status,
      400,
    );
    const verified = await request(1, "auth/verify", {
      challengeId: challenge.body.challengeId,
      code: validCode,
    });
    assert.equal(verified.status, 200);
    const session = await request(0, "session", undefined, verified.cookie);
    assert.equal(session.body.customer.id, verified.body.customer.id);
    assert.equal(
      (
        await request(0, "auth/verify", {
          challengeId: challenge.body.challengeId,
          code: validCode,
        })
      ).status,
      400,
    );
    const limited = await request(0, "auth/start", { phone: "9806600999" });
    const secondCode = code;
    const wrongCode = secondCode === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await request(i % 2, "auth/verify", {
            challengeId: limited.body.challengeId,
            code: wrongCode,
          })
        ).status,
        400,
      );
    assert.equal(
      (
        await request(1, "auth/verify", {
          challengeId: limited.body.challengeId,
          code: secondCode,
        })
      ).status,
      400,
    );
    await request(1, "logout", {}, verified.cookie);
    assert.equal(
      (await request(0, "session", undefined, verified.cookie)).body.customer,
      null,
    );
    assert.ok(
      JSON.stringify(data.runtimeState).includes("codeHash") === false,
      "Consumed challenges must be removed",
    );
  } finally {
    for (const app of apps) await new Promise((resolve) => app.close(resolve));
  }
});
