import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promptText, promptSecret } from "./private-input.mjs";
import { createSmsTransport } from "./sms.mjs";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");
try {
  const previous = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (process.argv.includes("--check")) {
    const env = parseEnv(previous);
    const configured =
      env.CUSTOMER_AUTH_MODE === "sms" && !!createSmsTransport({ env });
    console.log(
      configured
        ? "Sparrow SMS settings are present. Restart the backend and verify a real code on your phone. Delivery has not been tested by this check."
        : "Live SMS is not configured. Obtain a Sparrow account, assigned sender, API token and credits, then run npm run sms:setup.",
    );
  } else if (process.argv.includes("--help")) {
    console.log(
      "npm run sms:setup: enter your assigned Sparrow sender and hidden token privately.\nnpm run sms:check: check settings without sending or purchasing SMS.\nAn existing provider account and SMS credits are required.",
    );
  } else {
    if (process.argv.length > 2)
      throw new Error(
        "Use --check or --help; enter the token privately in the interactive setup.",
      );
    console.log(
      "Configure an existing Sparrow SMS account. No SMS is sent by this setup.",
    );
    const sender = await promptText("Sender assigned by Sparrow: ");
    const token = (await promptSecret("Sparrow API token (hidden): ")).trim();
    const env = {
      SMS_PROVIDER: "sparrow",
      SPARROW_SMS_SENDER: sender,
      SPARROW_SMS_TOKEN: token,
    };
    if (!createSmsTransport({ env }))
      throw new Error("Sender/token format is invalid. No settings changed.");
    const keys = [
      "CUSTOMER_AUTH_MODE",
      "SMS_PROVIDER",
      "SPARROW_SMS_SENDER",
      "SPARROW_SMS_TOKEN",
    ];
    const lines = previous
      .split(/\r?\n/)
      .filter(
        (line) =>
          !keys.some((key) => new RegExp(`^\\s*${key}\\s*=`).test(line)),
      );
    writeFileSync(
      envPath,
      [
        ...lines,
        "CUSTOMER_AUTH_MODE=sms",
        "SMS_PROVIDER=sparrow",
        `SPARROW_SMS_SENDER=${JSON.stringify(sender)}`,
        `SPARROW_SMS_TOKEN=${JSON.stringify(token)}`,
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    console.log(
      "Sparrow settings saved privately; other settings preserved. Restart the backend, request a login code and confirm real handset delivery.",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
