import { createApp } from "../backend/server.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = createApp({
  dataFile:
    process.env.QA_DATA_FILE ||
    path.join(root, "qa-results/backend-store.json"),
  emailTransport: null,
  customerAuthMode: "development",
  smsTransport: null,
});
const port = Number(process.env.QA_PORT || 8770);
app.listen(port, "127.0.0.1", () =>
  console.log(`Isolated QA preview: http://127.0.0.1:${port}`),
);
process.on("SIGINT", () => app.close(() => process.exit(0)));
process.on("SIGTERM", () => app.close(() => process.exit(0)));
