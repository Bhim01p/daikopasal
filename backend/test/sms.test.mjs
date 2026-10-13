import { test } from "node:test";
import assert from "node:assert/strict";
import { createSmsTransport } from "../sms.mjs";
import { createApp } from "./app-fixture.mjs";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

test("Sparrow adapter uses HTTPS POST, normalized Nepal numbers and never returns a login code", async () => {
  let request;
  const transport = createSmsTransport({
    provider: "sparrow",
    token: "private-test-token",
    sender: "TestSender",
    fetchFn: async (url, options) => {
      request = { url, ...options };
      return {
        ok: true,
        json: async () => ({
          response_code: 200,
          count: 1,
          response: "Queued",
        }),
      };
    },
  });
  assert.deepEqual(await transport.sendOTP("+9779806600444", "123456"), {
    accepted: true,
  });
  assert.equal(request.url, "https://api.sparrowsms.com/v2/sms/");
  assert.equal(request.method, "POST");
  assert.equal(request.redirect, "error");
  assert.ok(request.signal instanceof AbortSignal);
  const fields = new URLSearchParams(request.body);
  assert.equal(fields.get("token"), "private-test-token");
  assert.equal(fields.get("from"), "TestSender");
  assert.equal(fields.get("to"), "9806600444");
  assert.match(fields.get("text"), /123456/);
  assert.ok(fields.get("text").length <= 160);
  for (const phone of [
    "+14155552671",
    "+9779806600444,9800000000",
    "9806600444",
  ])
    await assert.rejects(
      () => transport.sendOTP(phone, "123456"),
      /Invalid verification/,
    );
  await assert.rejects(() => transport.sendOTP("+9779806600444", "letters"));
});

test("production SMS login verifies a provider-sent code without revealing it and refuses failed sends", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-sms-login-"));
  const file = path.join(directory, "store.json");
  let code;
  let accepted = true;
  const transport = createSmsTransport({
    provider: "sparrow",
    token: "private-test-token",
    sender: "TestSender",
    fetchFn: async (url, options) => {
      code = new URLSearchParams(options.body)
        .get("text")
        .match(/code is (\d{6})/)[1];
      return {
        ok: accepted,
        json: async () =>
          accepted
            ? { response_code: 200, count: 1 }
            : { response_code: 1013, response: "private-test-token" },
      };
    },
  });
  const oldEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const app = createApp({
    dataFile: file,
    emailTransport: null,
    customerAuthMode: "sms",
    smsTransport: transport,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const request = async (route, input) => {
    const response = await fetch(base + route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  };
  try {
    const challenge = await request("/api/customer/auth/start", {
      phone: "9806600888",
    });
    assert.equal(challenge.status, 200);
    assert.equal(challenge.data.mode, "sms");
    assert.equal(challenge.data.developmentCode, undefined);
    assert.ok(!JSON.stringify(challenge.data).includes(code));
    const verified = await request("/api/customer/auth/verify", {
      challengeId: challenge.data.challengeId,
      code,
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.data.customer.phone, "+9779806600888");
    assert.match(verified.headers.get("set-cookie"), /HttpOnly/);
    assert.equal(
      JSON.parse(readFileSync(file, "utf8")).customers[0].verifiedVia,
      "sms",
    );
    accepted = false;
    const failed = await request("/api/customer/auth/start", {
      phone: "9806600999",
    });
    assert.equal(failed.status, 503);
    assert.equal(failed.data.challengeId, undefined);
    assert.ok(!JSON.stringify(failed.data).includes(code));
    assert.ok(!JSON.stringify(failed.data).includes("private-test-token"));
    assert.equal(JSON.parse(readFileSync(file, "utf8")).customers.length, 1);
  } finally {
    await new Promise((resolve) => app.close(resolve));
    if (oldEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnvironment;
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});

test("disabled or incomplete SMS configuration makes no network calls; provider failures are redacted and not retried", async () => {
  for (const env of [
    {},
    { SMS_PROVIDER: "disabled" },
    { SMS_PROVIDER: "unknown" },
    { SMS_PROVIDER: "sparrow" },
    { SMS_PROVIDER: "sparrow", SPARROW_SMS_TOKEN: "secret" },
  ])
    assert.equal(createSmsTransport({ env }), null);
  for (const result of [
    {
      ok: false,
      json: async () => ({
        response_code: 1002,
        response: "private-test-token rejected",
      }),
    },
    { ok: true, json: async () => ({ response_code: 1013, count: 0 }) },
    { ok: true, json: async () => ({ response_code: 200, count: 0 }) },
    {
      ok: true,
      json: async () => {
        throw new Error("private-test-token malformed response");
      },
    },
    new Error("private-test-token timeout"),
  ]) {
    let calls = 0;
    const transport = createSmsTransport({
      provider: "sparrow",
      token: "private-test-token",
      sender: "TestSender",
      fetchFn: async () => {
        calls++;
        if (result instanceof Error) throw result;
        return result;
      },
    });
    await assert.rejects(
      () => transport.sendOTP("+9779806600444", "123456"),
      (error) =>
        error.message ===
        "SMS service could not accept the verification message.",
    );
    assert.equal(calls, 1);
  }
});
