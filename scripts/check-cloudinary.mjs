import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyCloudinary } from "../backend/cloudinary.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, ".env.local"))) loadEnvFile(path.join(root, ".env.local"));
if (existsSync(path.join(root, "backend", ".env")))
  loadEnvFile(path.join(root, "backend", ".env"));

try {
  const result = await verifyCloudinary();
  console.log(
    result.configured
      ? result.reachable
        ? "Cloudinary configuration detected and connection verified."
        : "Cloudinary configuration detected, but connection verification failed."
      : "Cloudinary configuration is incomplete.",
  );
  if (!result.configured || !result.reachable) process.exitCode = 1;
} catch {
  console.error("Cloudinary configuration detected, but connection verification failed.");
  process.exitCode = 1;
}
