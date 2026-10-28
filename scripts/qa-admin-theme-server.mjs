import { createApp } from "../backend/server.mjs";
import { hashAdminPassword } from "../backend/admin-settings.mjs";
const app = createApp({
  dataFile:
    process.env.WORKFLOW_QA_STORE || "qa-results/admin-theme-store.json",
  username: "qaowner",
  passwordHash: hashAdminPassword("qa-owner-password-only"),
  emailTransport: null,
  smsTransport: null,
  customerAuthMode: "development",
});
app.listen(8773, "127.0.0.1", () =>
  console.log("Isolated desktop QA: http://127.0.0.1:8773"),
);
process.on("SIGINT", () => app.close(() => process.exit(0)));
