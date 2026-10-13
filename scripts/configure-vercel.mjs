import { readFileSync, appendFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const deploymentFile = new URL("../backend/deployment.env", import.meta.url);
try {
  const project = JSON.parse(
    readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"),
  );
  if (
    project.projectName !== "machhapuchhreeelectronics" ||
    project.projectId !== "prj_UM7DJaZC9cWxMwClDEATmuNLz0gR"
  )
    throw new Error("Link the Machhapuchhree Vercel project first.");
  const local = parseEnv(
    readFileSync(new URL("../backend/.env", import.meta.url), "utf8"),
  );
  const saved = parseEnv(readFileSync(deploymentFile, "utf8"));
  const values = {
    DATABASE_URL: saved.DATABASE_URL,
    ADMIN_USERNAME: saved.ADMIN_USERNAME || local.ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH: saved.ADMIN_PASSWORD_HASH || local.ADMIN_PASSWORD_HASH,
    EMAIL_PROVIDER: "gmail",
    GMAIL_USER: saved.GMAIL_USER,
    GMAIL_APP_PASSWORD: saved.GMAIL_APP_PASSWORD?.replace(/\s/g, ""),
    EMAIL_FROM: saved.EMAIL_FROM,
    EMAIL_REPLY_TO: saved.EMAIL_REPLY_TO || saved.GMAIL_USER,
    COOKIE_SECURE: "true",
    CUSTOMER_AUTH_MODE: "email",
    SMS_PROVIDER: "disabled",
    CRON_SECRET: saved.CRON_SECRET || randomBytes(32).toString("hex"),
  };
  for (const [key, value] of Object.entries(values))
    if (!value || /[\r\n]/.test(value))
      throw new Error(`Check ${key} in the private configuration.`);
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(values.ADMIN_PASSWORD_HASH))
    throw new Error("Run npm run admin:setup before configuring Vercel.");
  if (!/^[a-zA-Z0-9]{16}$/.test(values.GMAIL_APP_PASSWORD))
    throw new Error("Use a 16-character Gmail app password.");
  const database = new URL(values.DATABASE_URL);
  if (!database.hostname.endsWith(".neon.tech"))
    throw new Error("Use the separate shop Neon connection string.");
  if (!saved.CRON_SECRET)
    appendFileSync(deploymentFile, `\nCRON_SECRET=${values.CRON_SECRET}\n`, {
      mode: 0o600,
    });
  console.log(
    "Configuring Production and Preview settings on machhapuchhreeelectronics. Secret values are never printed.",
  );
  for (const [key, value] of Object.entries(values)) {
    const args = [
      "--yes",
      "vercel@63.1.0",
      "env",
      "add",
      key,
      "production,preview",
      "--force",
      "--yes",
      "--sensitive",
    ];
    // Keys and arguments are fixed/allowlisted. Values go through stdin, never argv.
    const result =
      process.platform === "win32"
        ? spawnSync(
            process.env.ComSpec || "cmd.exe",
            ["/d", "/s", "/c", `npx.cmd ${args.join(" ")}`],
            { cwd: root, input: value, encoding: "utf8", timeout: 90000 },
          )
        : spawnSync("npx", args, {
            cwd: root,
            input: value,
            encoding: "utf8",
            timeout: 90000,
          });
    if (result.status !== 0)
      throw new Error(
        `Could not configure ${key}. Check Vercel sign-in and project access, then run this command again.`,
      );
    console.log(`Saved ${key}.`);
  }
  console.log(
    "Configuration complete. Push the updated code or create a new deployment next.",
  );
  console.log(
    "Email-code login uses the configured mail service. SMS remains disabled. Guest pickup orders remain available.",
  );
} catch (error) {
  // Only our own validation errors are shown; provider output and credentials stay private.
  console.error(
    error.message.startsWith("Check ") ||
      error.message.startsWith("Could not ") ||
      error.message.startsWith("Link ") ||
      error.message.startsWith("Run ") ||
      error.message.startsWith("Use ")
      ? error.message
      : "Configuration failed. Check the private files and Vercel project link.",
  );
  process.exitCode = 1;
}
