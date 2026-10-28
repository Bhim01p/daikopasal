import { test } from "node:test";
import assert from "node:assert/strict";
import { createCustomerAuth } from "../customer-auth.mjs";
import { seedStore } from "../store.mjs";
import { createApp } from "../server.mjs";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const request = {
  headers: { host: "localhost" },
  socket: { remoteAddress: "127.0.0.1" },
};
function setup() {
  let state = seedStore();
  let clock = 2000000,
    code,
    cookie;
  state.customers = [
    {
      id: "existing",
      email: "person@example.com",
      name: "Person",
      phone: "+9779806600444",
      verifiedVia: "email",
    },
  ];
  state.orders = [{ id: "owned-order", customerId: "existing" }];
  const store = {
    read: () => state,
    commit: (value) => {
      state = value;
    },
  };
  const options = {
    mode: "email",
    now: () => clock,
    emailTransport: {
      from: "test@example.com",
      send: async (message) => {
        code = message.text.match(/\d{6}/)[0];
      },
    },
  };
  const auth = createCustomerAuth(store, options);
  const response = {
    setHeader: (key, value) => {
      cookie = value;
    },
  };
  const signed = () => ({
    ...request,
    headers: { ...request.headers, cookie: cookie.split(";")[0] },
  });
  async function verify(rememberMe = true) {
    const challenge = await auth.start(request, {
      email: "person@example.com",
    });
    auth.verify(request, response, {
      challengeId: challenge.challengeId,
      code,
      rememberMe,
    });
    return signed();
  }
  return {
    auth,
    store,
    response,
    signed,
    verify,
    options,
    cookie: () => cookie,
    advance: (ms) => {
      clock += ms;
    },
  };
}
test("verified password setup hashes credentials, preserves identity/orders and remembered sessions survive auth recreation", async () => {
  const f = setup(),
    signed = await f.verify();
  assert.match(f.cookie(), /HttpOnly; SameSite=Lax.*Max-Age=2592000/);
  const publicUser = f.auth.setPassword(signed, f.response, {
    password: "long-test-password",
  });
  assert.equal(publicUser.id, "existing");
  assert.equal(publicUser.hasPassword, true);
  assert.equal(publicUser.passwordHash, undefined);
  assert.ok(!JSON.stringify(f.store.read()).includes("long-test-password"));
  assert.equal(f.store.read().orders[0].customerId, "existing");
  assert.equal(f.auth.session(signed), null);
  const newSession = f.signed();
  assert.ok(createCustomerAuth(f.store, f.options).session(newSession));
  assert.throws(
    () =>
      f.auth.passwordLogin(request, f.response, {
        email: "person@example.com",
        password: "wrong",
      }),
    /Email or password/,
  );
  f.auth.passwordLogin(request, f.response, {
    email: "PERSON@example.com",
    password: "long-test-password",
    rememberMe: false,
  });
  assert.match(f.cookie(), /Max-Age=86400/);
  assert.throws(
    () =>
      f.auth.setPassword(f.signed(), f.response, {
        password: "another-long-password",
      }),
    /fresh login code/,
  );
  f.advance(86400001);
  assert.equal(f.auth.session(f.signed()), null);
  assert.ok(f.auth.session(newSession));
});
test("password reset requires fresh email proof, revokes other sessions, rejects old passwords and limits guesses", async () => {
  const f = setup();
  await f.verify();
  f.auth.setPassword(f.signed(), f.response, { password: "old-long-password" });
  f.auth.passwordLogin(request, f.response, {
    email: "person@example.com",
    password: "old-long-password",
  });
  const old = f.signed();
  f.advance(61000);
  await f.verify();
  assert.throws(
    () => f.auth.setPassword(f.signed(), f.response, { password: "short" }),
    /10 to 128/,
  );
  f.auth.setPassword(f.signed(), f.response, { password: "new-long-password" });
  assert.equal(f.auth.session(old), null);
  assert.throws(
    () =>
      f.auth.passwordLogin(request, f.response, {
        email: "person@example.com",
        password: "old-long-password",
      }),
    /Email or password/,
  );
  f.auth.passwordLogin(request, f.response, {
    email: "person@example.com",
    password: "new-long-password",
  });
  for (let i = 0; i < 10; i++) {
    try {
      f.auth.passwordLogin(request, f.response, {
        email: "absent@example.com",
        password: "incorrect",
      });
    } catch {}
  }
  assert.throws(
    () =>
      f.auth.passwordLogin(request, f.response, {
        email: "absent@example.com",
        password: "incorrect",
      }),
    /Too many/,
  );
  f.advance(901000);
  await f.verify();
  f.advance(600001);
  assert.throws(
    () =>
      f.auth.setPassword(f.signed(), f.response, {
        password: "expired-proof-password",
      }),
    /fresh login code/,
  );
});
test("password setup respects the short session choice and HTTPS cookies are secure", async () => {
  const f = setup();
  const signed = await f.verify(false);
  f.auth.setPassword(signed, f.response, {
    password: "short-session-password",
  });
  assert.match(f.cookie(), /Max-Age=86400/);
  f.auth.passwordLogin(
    {
      ...request,
      headers: { ...request.headers, "x-forwarded-proto": "https" },
    },
    f.response,
    { email: "person@example.com", password: "short-session-password" },
  );
  assert.match(f.cookie(), /; Secure/);
});
test("profile photos are authenticated, private, format/size checked, replaceable and removable", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "me-avatar-"));
  let code;
  const app = createApp({
    dataFile: path.join(dir, "store.json"),
    customerAuthMode: "email",
    emailTransport: {
      from: "test@example.com",
      send: async (message) => {
        code = message.text.match(/\d{6}/)?.[0];
      },
    },
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = (route, body, cookie = "") =>
    fetch(base + route, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await fetch(base + "/api/customer/photo")).status, 401);
    const challenge = await (
      await post("/api/customer/auth/start", { email: "photo@example.com" })
    ).json();
    const verified = await post("/api/customer/auth/verify", {
      challengeId: challenge.challengeId,
      code,
    });
    const cookie = verified.headers.get("set-cookie").split(";")[0];
    const send = (data) =>
      fetch(base + "/api/customer/photo", {
        method: "POST",
        headers: { "Content-Type": "image/png", cookie },
        body: data,
      });
    assert.equal((await send(Buffer.from("not-a-png"))).status, 400);
    assert.equal((await send(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9L0AAAAASUVORK5CYII=",
      "base64",
    );
    const uploaded = await send(png);
    assert.equal(uploaded.status, 200);
    const { customer } = await uploaded.json();
    assert.match(customer.photo, /^\/api\/customer\/photo\?v=avatar-/);
    const photo = await fetch(base + customer.photo, { headers: { cookie } });
    assert.equal(photo.status, 200);
    assert.match(photo.headers.get("cache-control"), /private, no-store/);
    const name = new URL(base + customer.photo).searchParams.get("v");
    assert.equal((await fetch(base + "/api/images/" + name)).status, 404);
    assert.equal((await send(png)).status, 200);
    assert.equal(readdirSync(path.join(dir, "images")).length, 1);
    const removed = await fetch(base + "/api/customer/photo", {
      method: "DELETE",
      headers: { cookie },
    });
    assert.equal(removed.status, 200);
    assert.equal(readdirSync(path.join(dir, "images")).length, 0);
    assert.equal(
      (await fetch(base + "/api/customer/photo", { headers: { cookie } }))
        .status,
      404,
    );
  } finally {
    await new Promise((resolve) => app.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
