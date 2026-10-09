import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createDatabaseStore } from "../backend/database-store.mjs";
import { createGmailTransport } from "../backend/gmail.mjs";

const env = parseEnv(
  readFileSync(new URL("../backend/deployment.env", import.meta.url), "utf8"),
);
let store;
try {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");
  const url = new URL(env.DATABASE_URL);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:")
    throw new Error("DATABASE_URL must be a Postgres connection string.");
  if (!url.hostname.endsWith(".neon.tech"))
    throw new Error("Use the separate shop Neon project connection string.");
  store = createDatabaseStore(env.DATABASE_URL);
  await store.initialize();
  const summary = await store.transaction(() => {
    const data = store.read();
    return {
      products: data.products.length,
      orders: data.orders.length,
      queuedEmails: data.emailQueue.filter((job) => job.state === "queued")
        .length,
    };
  });
  console.log(
    "Neon connected; shop data initialized:",
    JSON.stringify(summary),
  );
  const gmail = createGmailTransport(env);
  if (!gmail) throw new Error("Gmail configuration is incomplete.");
  await gmail.verify();
  console.log("Gmail SMTP authentication verified. No emails were sent.");
} catch (error) {
  // Provider errors may include connection strings or credentials. Never print them.
  console.error(
    "Deployment configuration check failed.",
    error.code === "EAUTH"
      ? "Gmail rejected the app password."
      : "Check the private connection settings and network access.",
  );
  process.exitCode = 1;
} finally {
  await store?.close();
}
