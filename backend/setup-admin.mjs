import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureAdmin } from "./admin-settings.mjs";
import { promptText, promptSecret } from "./private-input.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, ".env");
const args = process.argv.slice(2);
try {
  if (args.some((value) => !["--custom", "--reset", "--help"].includes(value)))
    throw new Error(
      "Use --custom to enter your login privately, or --reset for a generated password.",
    );
  if (args.includes("--help")) {
    console.log(
      "npm run admin:setup -- --custom: choose your username and hidden password.\nnpm run admin:setup -- --reset: generate a new password.\nRestart the backend after changing access.",
    );
  } else {
    const current = existsSync(envPath)
      ? parseEnv(readFileSync(envPath, "utf8"))
      : {};
    if (
      current.ADMIN_PASSWORD_HASH &&
      !args.includes("--reset") &&
      !args.includes("--custom")
    ) {
      console.log(
        "Admin is already configured. Use --custom to choose your login, or --reset to generate a new password.",
      );
    } else {
      let username = "admin";
      let password = randomBytes(18).toString("base64url");
      const custom = args.includes("--custom");
      if (custom) {
        username = await promptText("Choose admin username: ");
        password = await promptSecret(
          "Choose password (12+ characters, hidden): ",
        );
        const confirmation = await promptSecret("Repeat password (hidden): ");
        if (password !== confirmation)
          throw new Error("Passwords did not match. No settings changed.");
      }
      configureAdmin({
        envPath,
        accessPath: path.join(root, "ADMIN-ACCESS.txt"),
        username,
        password,
        custom,
      });
      console.log(
        custom
          ? "Your chosen admin login is saved. The password is stored only as a hash. Restart the backend."
          : "Admin configured. Read backend/ADMIN-ACCESS.txt for the local login, then restart the backend.",
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
