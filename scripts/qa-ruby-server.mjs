import { createApp } from "../backend/server.mjs";
import { hashAdminPassword } from "../backend/admin-settings.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("qa-results", { recursive: true });
const app = createApp({
  dataFile: process.env.WORKFLOW_QA_STORE || "qa-results/ruby-store.json",
  username: "qaowner",
  passwordHash: hashAdminPassword("qa-owner-password-only"),
  customerAuthMode: "email",
  smsTransport: null,
  emailTransport: {
    from: "qa@example.com",
    send: async (message) => {
      if (message.subject.startsWith("Your login code"))
        writeFileSync(
          "qa-results/ruby-otp.json",
          JSON.stringify({
            email: message.to[0],
            code: message.text.match(/\d{6}/)[0],
          }),
        );
      return "qa-message";
    },
  },
});
app.listen(8773, "127.0.0.1", () =>
  console.log("Isolated redesign QA: http://127.0.0.1:8773"),
);
process.on("SIGINT", () => app.close(() => process.exit(0)));
