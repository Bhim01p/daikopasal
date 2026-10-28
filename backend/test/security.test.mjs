import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { scryptSync } from "node:crypto";
import { createApp } from "./app-fixture.mjs";

test("public product API filters unknown stored fields and admin cookies are secure on HTTPS", async () => {
  const directory = mkdtempSync(path.join(process.cwd(), ".me-security-test-"));
  const fixtureProducts = JSON.parse(
    readFileSync(new URL("./fixtures/products.json", import.meta.url), "utf8"),
  );
  fixtureProducts[0].internalCredential = "must-not-be-public";
  const password = "security-test-password";
  const salt = "0123456789abcdef0123456789abcdef";
  let adminNow = Date.now();
  const originalMfaEmail = process.env.ADMIN_MFA_EMAIL;
  process.env.ADMIN_MFA_EMAIL = "security-test@example.invalid";
  const sentMessages = [];
  const app = createApp({
    dataFile: path.join(directory, "store.json"),
    initialProducts: fixtureProducts,
    username: "security-test-admin",
    adminNow: () => adminNow,
    emailTransport: {
      from: "security-test@example.invalid",
      async send(message) {
        sentMessages.push(message);
        return "test-message-id";
      },
    },
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
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

  try {
    const catalogue = (await invoke("/api/products")).data;
    assert.equal(catalogue.products[0].internalCredential, undefined);
    assert.equal(catalogue.products[0].name, fixtureProducts[0].name);
    assert.equal((await invoke("/api/admin/orders")).status, 401);

    const login = await invoke(
      "/api/admin/login",
      "POST",
      {
        username: "security-test-admin",
        password,
      },
      { "x-forwarded-proto": "https" },
    );
    assert.equal(login.status, 200);
    assert.equal(login.data.mfaRequired, true);
    assert.equal(login.headers["set-cookie"], undefined);
    const loginCode = sentMessages.at(-1).text.match(/code is (\d{6})/)?.[1];
    assert.ok(loginCode);
    const verifiedLogin = await invoke(
      "/api/admin/login/verify",
      "POST",
      {
        challengeId: login.data.challengeId,
        code: loginCode,
      },
      { "x-forwarded-proto": "https" },
    );
    assert.equal(verifiedLogin.status, 200);
    assert.equal(verifiedLogin.data.user.role, "owner");
    assert.match(verifiedLogin.headers["set-cookie"], /; Secure(?:;|$)/);
    assert.match(verifiedLogin.headers["set-cookie"], /Max-Age=3600/);

    const ownerCookie = verifiedLogin.headers["set-cookie"].split(";")[0];
    const staffPassword = "staff-security-test-password";
    const createdStaff = await invoke(
      "/api/admin/staff",
      "POST",
      {
        username: "security-test-staff",
        name: "Security Test Staff",
        password: staffPassword,
      },
      { cookie: ownerCookie },
    );
    assert.equal(createdStaff.status, 201);
    const staffLogin = await invoke("/api/admin/login", "POST", {
      username: "security-test-staff",
      password: staffPassword,
    });
    assert.equal(staffLogin.status, 200);
    const staffCode = sentMessages.at(-1).text.match(/code is (\d{6})/)?.[1];
    const staffVerify = await invoke("/api/admin/login/verify", "POST", {
      challengeId: staffLogin.data.challengeId,
      code: staffCode,
    });
    assert.equal(staffVerify.status, 200);
    const staffCookie = staffVerify.headers["set-cookie"].split(";")[0];
    assert.equal(
      (
        await invoke(
          "/api/admin/emails/example/retry",
          "POST",
          {},
          { cookie: staffCookie },
        )
      ).status,
      403,
    );
    adminNow += 11 * 60 * 1000;
    assert.equal(
      (
        await invoke(
          "/api/admin/payment-config",
          "PATCH",
          {},
          { cookie: ownerCookie },
        )
      ).status,
      403,
    );
  } finally {
    app.emit("close");
    rmSync(directory, { recursive: true, force: true });
    if (originalMfaEmail === undefined) delete process.env.ADMIN_MFA_EMAIL;
    else process.env.ADMIN_MFA_EMAIL = originalMfaEmail;
  }
});
