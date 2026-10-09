import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { scryptSync } from "node:crypto";
import { parseEnv } from "node:util";
import os from "node:os";
import path from "node:path";
import { configureAdmin } from "../admin-settings.mjs";

test("custom admin login preserves service settings, replaces old credentials, and never saves the chosen password", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-admin-settings-"));
  const envPath = path.join(directory, ".env");
  const accessPath = path.join(directory, "access.txt");
  try {
    writeFileSync(
      envPath,
      "EMAIL_PROVIDER=disabled\nSPARROW_SMS_TOKEN=test-only\n ADMIN_USERNAME = old\nADMIN_PASSWORD_HASH=old\n",
    );
    const password = "test-custom-password-123";
    configureAdmin({
      envPath,
      accessPath,
      username: "shop.owner",
      password,
      custom: true,
    });
    const content = readFileSync(envPath, "utf8");
    const env = parseEnv(content);
    assert.equal(env.ADMIN_USERNAME, "shop.owner");
    assert.equal(env.EMAIL_PROVIDER, "disabled");
    assert.equal(env.SPARROW_SMS_TOKEN, "test-only");
    const [salt, hash] = env.ADMIN_PASSWORD_HASH.split(":");
    assert.equal(scryptSync(password, salt, 64).toString("hex"), hash);
    assert.ok(!content.includes(password));
    assert.ok(!readFileSync(accessPath, "utf8").includes(password));
    assert.equal(content.match(/ADMIN_USERNAME\s*=/g).length, 1);
    for (const input of [
      { username: "a", password },
      { username: "admin\nOTHER=1", password },
      { username: "admin", password: "short" },
    ]) {
      assert.throws(() =>
        configureAdmin({ envPath, accessPath, ...input, custom: true }),
      );
      assert.equal(readFileSync(envPath, "utf8"), content);
    }
  } finally {
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    rmSync(directory, { recursive: true, force: true });
  }
});
