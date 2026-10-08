import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, ".env");
if (existsSync(envPath) && !process.argv.includes("--reset")) {
  console.log(
    "Admin is already configured. Use npm run admin:setup -- --reset to rotate access.",
  );
  process.exit(0);
}
const username = "admin";
const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const previous = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter(
        (line) =>
          !line.startsWith("ADMIN_USERNAME=") &&
          !line.startsWith("ADMIN_PASSWORD_HASH="),
      )
  : ["PORT=3001", "HOST=127.0.0.1", "COOKIE_SECURE=false"];
writeFileSync(
  envPath,
  [
    ...previous,
    `ADMIN_USERNAME=${username}`,
    `ADMIN_PASSWORD_HASH=${salt}:${hash}`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);
writeFileSync(
  path.join(root, "ADMIN-ACCESS.txt"),
  `Local admin access\n\nURL: http://127.0.0.1:8767/admin\nUsername: ${username}\nPassword: ${password}\n\nThis file is ignored by Git. Keep it private.\nReset access with npm run admin:setup -- --reset, then restart the backend.\n`,
  { mode: 0o600 },
);
console.log(
  "Admin configured. Read backend/ADMIN-ACCESS.txt for the local login.",
);
