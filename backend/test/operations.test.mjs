import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { createApp } from "./app-fixture.mjs";

test("admin bill, customer PDF, repair tracking and pickup handover enforce access and stock rules", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "me-operations-"));
  const salt = randomBytes(16).toString("hex");
  const password = "operations-test-password";
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  const app = createApp({ dataFile: path.join(directory, "store.json"), username: "owner", passwordHash });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  let cookie = "";
  async function call(route, method = "GET", input, admin = false, headers = {}) {
    const response = await fetch(base + route, { method, headers: { ...(input ? { "Content-Type": "application/json" } : {}), ...(admin ? { Cookie: cookie } : {}), ...headers }, body: input ? JSON.stringify(input) : undefined });
    return { status: response.status, headers: response.headers, data: response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.arrayBuffer() };
  }
  try {
    const login = await call("/api/admin/login", "POST", { username: "owner", password });
    cookie = login.headers.get("set-cookie").split(";")[0];
    const product = (await call("/api/products")).data.products.find((p) => p.available && !p.priceIsEstimate);
    const initialStock = product.stockQuantity;
    const order = (await call("/api/orders", "POST", { name: "Guest Buyer", phone: "9806600444", email: "guest@example.com", items: [{ productId: product.id, quantity: 1 }], expectedTotal: product.price, requestId: randomUUID() })).data.order;
    assert.equal((await call(`/api/admin/orders/${order.id}`, "PATCH", { status: "Completed", pickupReference: order.id }, true)).status, 409);
    assert.equal((await call(`/api/admin/orders/${order.id}`, "PATCH", { status: "Ready for pickup" }, true)).status, 200);
    assert.equal((await call(`/api/admin/orders/${order.id}`, "PATCH", { status: "Completed", pickupReference: "wrong" }, true)).status, 400);
    assert.equal((await call(`/api/admin/orders/${order.id}`, "PATCH", { status: "Completed", pickupReference: order.id }, true)).status, 200);
    assert.equal((await call(`/api/orders/${order.id}/bill`, "GET", undefined, false, { "X-Order-Token": order.receiptToken })).status, 404);
    assert.equal((await call("/api/admin/bills", "POST", { orderId: order.id }, true)).status, 201);
    assert.equal((await call(`/api/orders/${order.id}/bill`)).status, 404);
    const pdf = await call(`/api/orders/${order.id}/bill`, "GET", undefined, false, { "X-Order-Token": order.receiptToken });
    assert.equal(pdf.status, 200);
    assert.equal(Buffer.from(pdf.data).subarray(0, 4).toString(), "%PDF");
    assert.equal((await call("/api/products")).data.products.find((p) => p.id === product.id).stockQuantity, initialStock - 1);

    const created = await call("/api/admin/repairs", "POST", { customerName: "Repair Buyer", phone: "9806600444", device: "Pulsar NS200 meter", problem: "Display blank" }, true);
    assert.equal(created.status, 201);
    const ticket = created.data.ticket;
    assert.equal((await call(`/api/repairs/${ticket.id}`)).status, 404);
    assert.equal((await call(`/api/repairs/${ticket.id}`, "GET", undefined, false, { "X-Repair-Token": ticket.token })).data.ticket.status, "Received");
    assert.equal((await call(`/api/admin/repairs/${ticket.id}`, "PATCH", { status: "Inspecting" }, true)).status, 200);
    assert.equal((await call(`/api/repairs/${ticket.id}`, "GET", undefined, false, { "X-Repair-Token": ticket.token })).data.ticket.status, "Inspecting");

    assert.equal((await call(`/api/admin/products/${product.id}/review`, "POST", undefined, true)).status, 200);
    assert.ok((await call("/api/products")).data.products.find((p) => p.id === product.id).reviewedAt);
  } finally {
    await new Promise((resolve) => app.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});
