import { createApp } from "./server.mjs";
import { createDatabaseStore } from "./database-store.mjs";

let app;
export function getHostedApp() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  if (process.env.CUSTOMER_AUTH_MODE === "development")
    throw new Error("Development login must not be enabled on a hosted shop.");
  app ||= createApp({
    store: createDatabaseStore(process.env.DATABASE_URL),
    serverless: true,
  });
  return app;
}

export const hostedEmailBatch = { maxJobs: 5, maxDurationMs: 120000 };
