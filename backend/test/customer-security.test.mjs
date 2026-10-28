import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { createApp } from "./app-fixture.mjs";

test("customer can revoke every session and receives a password-change email", async () => {
  const directory = mkdtempSync(
    path.join(process.cwd(), ".me-customer-security-"),
  );
  const sentMessages = [];
  let now = Date.now();
  const emailTransport = {
    from: "security-test@example.invalid",
    async send(message) {
      sentMessages.push(message);
      return "test-message-id";
    },
  };
  const app = createApp({
    dataFile: path.join(directory, "store.json"),
    customerAuthMode: "email",
    customerNow: () => now,
    emailTransport,
  });
  const invoke = async (route, method = "GET", input, headers = {}) => {
    const request = Readable.from(
      input ? [Buffer.from(JSON.stringify(input))] : [],
    );
    request.method = method;
    request.url = route;
    request.headers = {
      host: "localhost",
      ...(input ? { "content-type": "application/json" } : {}),
      ...headers,
    };
    request.socket = { remoteAddress: "127.0.0.1" };
    const response = {
      headers: {},
      headersSent: false,
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      writeHead(status, responseHeaders = {}) {
        this.status = status;
        Object.assign(
          this.headers,
          Object.fromEntries(
            Object.entries(responseHeaders).map(([key, value]) => [
              key.toLowerCase(),
              value,
            ]),
          ),
        );
        this.headersSent = true;
      },
      end(value = "") {
        this.body = String(value);
      },
    };
    await app.handle(request, response);
    return { ...response, data: JSON.parse(response.body || "null") };
  };
  const requestCode = async () => {
    const startIndex = sentMessages.length;
    const start = await invoke("/api/customer/auth/start", "POST", {
      email: "customer@example.com",
    });
    assert.equal(start.status, 200);
    const message = sentMessages[startIndex];
    const code = message.text.match(/code is (\d{6})/)?.[1];
    assert.ok(code);
    const verified = await invoke("/api/customer/auth/verify", "POST", {
      challengeId: start.data.challengeId,
      code,
    });
    assert.equal(verified.status, 200);
    return verified.headers["set-cookie"].split(";")[0];
  };

  try {
    const firstSession = await requestCode();
    now += 60_001;
    const secondSession = await requestCode();
    const changed = await invoke(
      "/api/customer/password",
      "POST",
      {
        password: "customer-security-test-password",
      },
      { cookie: secondSession },
    );
    assert.equal(changed.status, 200);
    const freshSession = changed.headers["set-cookie"].split(";")[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.ok(
      sentMessages.some((message) =>
        message.subject.includes("password was changed"),
      ),
    );

    const logoutAll = await invoke(
      "/api/customer/logout-all",
      "POST",
      {},
      { cookie: freshSession },
    );
    assert.equal(logoutAll.status, 200);
    assert.match(logoutAll.headers["set-cookie"], /Max-Age=0/);
    assert.equal(
      (
        await invoke("/api/customer/session", "GET", undefined, {
          cookie: firstSession,
        })
      ).data.customer,
      null,
    );
    assert.equal(
      (
        await invoke("/api/customer/session", "GET", undefined, {
          cookie: secondSession,
        })
      ).data.customer,
      null,
    );
  } finally {
    app.emit("close");
    rmSync(directory, { recursive: true, force: true });
  }
});
