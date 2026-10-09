import { createInterface } from "node:readline/promises";

export async function promptText(label) {
  const reader = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return (await reader.question(label)).trim();
  } finally {
    reader.close();
  }
}

export function promptSecret(label) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode)
    throw new Error(
      "Run this setup in an interactive terminal so the secret stays hidden.",
    );
  return new Promise((resolve, reject) => {
    let value = "";
    let active = true;
    const finish = (error) => {
      if (!active) return;
      active = false;
      process.stdin.removeListener("data", input);
      if (process.stdin.isRaw) process.stdin.setRawMode(false);
      process.stdin.removeListener("error", failed);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const input = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003")
          return finish(new Error("Setup cancelled. No settings changed."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b")
          value = Array.from(value).slice(0, -1).join("");
        else if (character >= " " && value.length < 512) value += character;
      }
    };
    const failed = () =>
      finish(
        new Error(
          "This terminal cannot hide secrets. Run setup in an interactive PowerShell terminal. No settings changed.",
        ),
      );
    process.stdin.once("error", failed);
    try {
      process.stdin.setRawMode(true);
    } catch {
      failed();
    }
    if (!active) return;
    process.stdout.write(label);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdin.on("data", input);
  });
}
