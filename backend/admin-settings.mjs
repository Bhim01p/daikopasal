import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function configureAdmin({
  envPath,
  accessPath,
  username,
  password,
  custom = false,
}) {
  if (!/^[A-Za-z0-9_.-]{3,40}$/.test(username))
    throw new Error(
      "Username must be 3–40 letters, numbers, dots, hyphens or underscores.",
    );
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 200 ||
    password !== password.trim() ||
    /[\u0000-\u001f\u007f]/.test(password)
  )
    throw new Error(
      "Password must have 12–200 characters, without surrounding spaces or control characters.",
    );
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const previous = existsSync(envPath)
    ? readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .filter((line) => !/^\s*ADMIN_(USERNAME|PASSWORD_HASH)\s*=/.test(line))
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
    accessPath,
    `Local admin access\n\nURL: http://127.0.0.1:8767/admin\nUsername: ${username}\n` +
      (custom
        ? "Password: Your chosen password is not stored in this file.\n"
        : `Password: ${password}\n`) +
      "\nKeep this file private.\nChoose your own login with npm run admin:setup -- --custom.\nGenerate a new random password with npm run admin:setup -- --reset.\nRestart the backend after changing access.\n",
    { mode: 0o600 },
  );
}
