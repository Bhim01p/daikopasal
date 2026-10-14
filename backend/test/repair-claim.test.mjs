import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { createApp } from "./app-fixture.mjs";

test("shop repair code links once to a signed-in customer and keeps other tickets private", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "me-repair-claim-"));
  const salt = randomBytes(16).toString("hex");
  const password = "owner-test-password";
  const app = createApp({ dataFile: path.join(directory, "store.json"), username: "owner",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    customerAuthMode: "email", emailTransport: { from: "shop@example.com", send: async (message) => { emailCode = message.text.match(/\d{6}/)[0]; } } });
  let emailCode = "";
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  async function call(route, method = "GET", input, cookie = "") {
    const response = await fetch(base + route, { method, headers: { ...(input ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: input ? JSON.stringify(input) : undefined });
    return { status: response.status, cookie: response.headers.get("set-cookie")?.split(";")[0], data: await response.json() };
  }
  try {
    const admin = (await call("/api/admin/login", "POST", { username: "owner", password })).cookie;
    const created = await call("/api/admin/repairs", "POST", { customerName: "Buyer", phone: "9806600444", device: "Pulsar meter", problem: "Blank screen" }, admin);
    assert.equal(created.status, 201);
    const ticket = created.data.ticket;
    assert.match(ticket.claimCode, /^\d{6}$/);
    const started = await call("/api/customer/auth/start", "POST", { email: "buyer@example.com" });
    const customer = (await call("/api/customer/auth/verify", "POST", { challengeId: started.data.challengeId, code: emailCode })).cookie;
    assert.deepEqual((await call("/api/customer/repairs", "GET", undefined, customer)).data.tickets, []);
    assert.equal((await call("/api/customer/repairs/claim", "POST", { phone: "9806600444", code: "000000" }, customer)).status, 404);
    assert.equal((await call("/api/customer/repairs/claim", "POST", { phone: "+9779806600444", code: ticket.claimCode })).status, 401);
    assert.equal((await call("/api/customer/repairs/claim", "POST", { phone: "+9779806600444", code: ticket.claimCode }, customer)).status, 200);
    assert.equal((await call("/api/customer/repairs", "GET", undefined, customer)).data.tickets[0].device, "Pulsar meter");
    assert.equal((await call("/api/admin/repairs", "GET", undefined, admin)).data.tickets[0].claimCode, null);
    assert.equal((await call(`/api/admin/repairs/${ticket.id}`, "PATCH", { status: "Inspecting" }, admin)).status, 200);
    assert.equal((await call("/api/customer/repairs", "GET", undefined, customer)).data.tickets[0].status, "Inspecting");
    const otherStart = await call("/api/customer/auth/start", "POST", { email: "other@example.com" });
    const other = (await call("/api/customer/auth/verify", "POST", { challengeId: otherStart.data.challengeId, code: emailCode })).cookie;
    assert.deepEqual((await call("/api/customer/repairs", "GET", undefined, other)).data.tickets, []);
    assert.equal((await call("/api/customer/repairs/claim", "POST", { phone: "9806600444", code: ticket.claimCode }, other)).status, 404);
  } finally {
    await new Promise((resolve) => app.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});
