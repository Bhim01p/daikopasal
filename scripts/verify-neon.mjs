import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import postgres from "postgres";
import { createDatabaseStore } from "../backend/database-store.mjs";
import { createApp } from "../backend/server.mjs";

const env = parseEnv(
  readFileSync(new URL("../backend/deployment.env", import.meta.url), "utf8"),
);
const schema = `qa_deployment_${randomBytes(10).toString("hex")}`;
const clients = [];
const apps = [];
const bases = [];
const password = randomUUID();
const salt = randomBytes(16).toString("hex");
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
let cookie = "";
const open = async () => {
  const store = createDatabaseStore(env.DATABASE_URL, { schema });
  clients.push(store);
  const app = createApp({
    store,
    serverless: true,
    username: "deploymenttest",
    passwordHash,
    customerAuthMode: "disabled",
    smsTransport: null,
    emailTransport: null,
  });
  apps.push(app);
  await new Promise((resolve, reject) => {
    app.once("error", reject);
    app.listen(0, "127.0.0.1", resolve);
  });
  bases.push(`http://127.0.0.1:${app.address().port}`);
  return store;
};
async function request(
  instance,
  route,
  method = "GET",
  input,
  admin = false,
  headers = {},
) {
  const result = await fetch(bases[instance] + "/api" + route, {
    method,
    headers: {
      ...(input ? { "Content-Type": "application/json" } : {}),
      ...(admin ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  return {
    status: result.status,
    body: await result.json(),
    headers: result.headers,
  };
}
try {
  if (!env.DATABASE_URL) throw new Error("Neon is not configured.");
  await open();
  await open();
  const source = (await request(0, "/products")).body.products[0];
  const login = await request(0, "/admin/login", "POST", {
    username: "deploymenttest",
    password,
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await request(1, "/admin/orders", "GET", undefined, true)).status,
    200,
  );
  console.log(
    "PASS admin sessions work across separate Neon-backed app instances.",
  );
  const created = await request(
    1,
    "/admin/products",
    "POST",
    {
      ...source,
      name: "Isolated Neon test phone",
      price: 12345,
      stockQuantity: 1,
      isSample: false,
    },
    true,
  );
  assert.equal(created.status, 201);
  const product = created.body.product;
  const input = () => ({
    name: "Deployment Test",
    phone: "9806600444",
    email: "deployment-test@example.com",
    language: "ne",
    requestId: randomUUID(),
    expectedTotal: product.price,
    items: [{ productId: product.id, quantity: 1 }],
  });
  const purchase = input();
  const competing = await Promise.all([
    request(0, "/orders", "POST", purchase),
    request(1, "/orders", "POST", input()),
  ]);
  assert.deepEqual(competing.map((r) => r.status).sort(), [201, 409]);
  const winner = competing.find((r) => r.status === 201);
  const winnerInput = competing[0].status === 201 ? purchase : null;
  if (winnerInput)
    assert.equal(
      (await request(1, "/orders", "POST", winnerInput)).body.order.id,
      winner.body.order.id,
    );
  const order = winner.body.order;
  assert.equal(order.total, product.price);
  console.log(
    "PASS concurrent last-unit orders reserve stock once, with server pricing.",
  );
  assert.equal((await request(1, `/orders/${order.id}`)).status, 404);
  assert.equal(
    (
      await request(1, `/orders/${order.id}`, "GET", undefined, false, {
        "X-Order-Token": order.receiptToken,
      })
    ).status,
    200,
  );
  await open();
  assert.equal(
    (
      await request(2, "/admin/orders", "GET", undefined, true)
    ).body.orders.some((o) => o.id === order.id),
    true,
  );
  const photo = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
    "base64",
  );
  const upload = await fetch(bases[0] + "/api/admin/images", {
    method: "POST",
    headers: { "Content-Type": "image/png", Cookie: cookie },
    body: photo,
  });
  assert.equal(upload.status, 201);
  const { image } = await upload.json();
  const restored = await fetch(bases[2] + image);
  assert.equal(restored.status, 200);
  assert.deepEqual(Buffer.from(await restored.arrayBuffer()), photo);
  console.log(
    "PASS orders, sessions, private receipts and photo bytes persist after app recreation.",
  );
  for (const status of ["Confirmed", "Ready for pickup", "Completed"])
    assert.equal(
      (await request(2, `/admin/orders/${order.id}`, "PATCH", { status }, true))
        .status,
      200,
    );
  const queued = await clients[2].transaction(() =>
    clients[2].read().emailQueue.filter((j) => j.orderId === order.id),
  );
  assert.equal(queued.length, 4);
  assert.equal(
    queued.every((j) => j.state === "queued"),
    true,
  );
  assert.equal(
    (
      await request(
        0,
        `/admin/orders/${order.id}`,
        "PATCH",
        { status: "Cancelled" },
        true,
      )
    ).status,
    409,
  );
  console.log(
    "PASS complete pickup lifecycle and four persistent notification jobs; no live emails sent.",
  );
} catch (error) {
  console.error(
    "Neon integration check failed.",
    error instanceof assert.AssertionError
      ? `Assertion: ${error.actual} expected ${error.expected}`
      : "Verify the private connection and network access.",
  );
  process.exitCode = 1;
} finally {
  for (const app of apps)
    await new Promise((resolve) => {
      app.close(resolve);
      app.closeAllConnections();
    });
  for (const client of clients) await client.close();
  if (env.DATABASE_URL && /^qa_deployment_[a-f0-9]{20}$/.test(schema)) {
    const cleanup = postgres(env.DATABASE_URL, {
      ssl: { rejectUnauthorized: true },
      max: 1,
      prepare: false,
      connect_timeout: 10,
    });
    try {
      await cleanup`drop schema if exists ${cleanup(schema)} cascade`;
      console.log(
        "Isolated test schema removed; shop data was not used for test orders.",
      );
    } catch {
      console.error("Test schema cleanup needs attention.");
      process.exitCode = 1;
    } finally {
      await cleanup.end({ timeout: 5 });
    }
  }
}
