import { existsSync, statSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudinary, configureCloudinary } from "../backend/cloudinary.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, ".env.local")))
  loadEnvFile(path.join(root, ".env.local"));
if (existsSync(path.join(root, "backend", ".env")))
  loadEnvFile(path.join(root, "backend", ".env"));

const file = process.argv[2];
if (!file || process.argv.length !== 3) {
  console.error(
    "Usage: node scripts/upload-cloudinary-test.mjs path/to/disposable-test-image.jpg",
  );
  process.exit(1);
}
if (!existsSync(file) || !statSync(file).isFile()) {
  console.error("The specified test image does not exist or is not a file.");
  process.exit(1);
}
if (!configureCloudinary()) {
  console.error("Cloudinary configuration is incomplete.");
  process.exit(1);
}

try {
  const result = await cloudinary.uploader.upload(file, {
    folder: "machhapuchhree-electronics/test",
    public_id: "cloudinary-connection-test",
    overwrite: true,
    resource_type: "image",
  });
  console.log(
    JSON.stringify(
      {
        success: true,
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
      null,
      2,
    ),
  );
} catch {
  console.error(JSON.stringify({ success: false }));
  process.exitCode = 1;
}
