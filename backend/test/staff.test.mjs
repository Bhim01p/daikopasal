import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashAdminPassword } from "../admin-settings.mjs";
import { createApp } from "../server.mjs";

test("staff permissions, private credentials, revocation and restart persistence", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-staff-test-"));
  const password = "owner-test-password-123";
  const options = {
    dataFile: path.join(directory, "store.json"),
    username: "owner",
    passwordHash: hashAdminPassword(password),
    emailTransport: null,
    smsTransport: null,
  };
  let app = createApp(options);
  let base;
  const start = async () => {
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${app.address().port}`;
  };
  const request = async (route, method = "GET", input, cookie = "") => {
    const response = await fetch(base + "/api/admin/" + route, {
      method,
      headers: {
        Cookie: cookie,
        ...(input ? { "Content-Type": "application/json" } : {}),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const login = (username, password) =>
    request("login", "POST", { username, password });
  await start();
  try {
    assert.equal((await request("staff")).status, 401);
    const owner = await login("owner", password);
    assert.equal(owner.data.user.role, "owner");
    const staffPassword = "staff-test-password-123";
    const created = await request(
      "staff",
      "POST",
      {
        username: "helper",
        name: "Shop Helper",
        password: staffPassword,
        role: "owner",
      },
      owner.cookie,
    );
    assert.equal(created.status, 201);
    assert.deepEqual(Object.keys(created.data.account).sort(), [
      "createdAt",
      "enabled",
      "id",
      "name",
      "username",
    ]);
    assert.ok(!readFileSync(options.dataFile, "utf8").includes(staffPassword));
    const id = created.data.account.id;
    assert.equal(
      (
        await request(
          "staff",
          "POST",
          { username: "OWNER", name: "Owner", password: staffPassword },
          owner.cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          "staff",
          "POST",
          { username: "another", name: "Another", password: "short" },
          owner.cookie,
        )
      ).status,
      400,
    );
    let staff = await login("HELPER", staffPassword);
    assert.equal(staff.data.user.role, "staff");
    assert.equal(
      (await request("orders", "GET", undefined, staff.cookie)).status,
      200,
    );
    for (const [route, method, body] of [
      ["staff", "GET"],
      ["staff", "POST", { role: "owner" }],
      [`staff/${id}`, "PATCH", { enabled: true }],
    ]) {
      assert.equal(
        (await request(route, method, body, staff.cookie)).status,
        403,
      );
    }
    const revokedCookie = staff.cookie;
    assert.equal(
      (await request(`staff/${id}`, "PATCH", { enabled: false }, owner.cookie))
        .status,
      200,
    );
    assert.equal(
      (await request("orders", "GET", undefined, revokedCookie)).status,
      401,
    );
    assert.equal((await login("helper", staffPassword)).status, 401);
    await request(`staff/${id}`, "PATCH", { enabled: true }, owner.cookie);
    assert.equal(
      (await request("orders", "GET", undefined, revokedCookie)).status,
      401,
    );
    staff = await login("helper", staffPassword);
    assert.equal(staff.status, 200);
    const nextPassword = "replacement-password-123";
    await request(
      `staff/${id}`,
      "PATCH",
      { password: nextPassword },
      owner.cookie,
    );
    assert.equal(
      (await request("orders", "GET", undefined, staff.cookie)).status,
      401,
    );
    assert.equal((await login("helper", staffPassword)).status, 401);
    assert.equal((await login("helper", nextPassword)).status, 200);
    await new Promise((resolve) => app.close(resolve));
    app = createApp(options);
    await start();
    assert.equal((await login("helper", nextPassword)).data.user.role, "staff");
  } finally {
    await new Promise((resolve) => app.close(resolve));
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
