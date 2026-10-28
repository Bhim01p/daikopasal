import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { HttpError } from "./validation.mjs";

export async function saveProductImage(
  request,
  directory,
  storage,
  { avatar = false } = {},
) {
  const { type, data } = await readImageUpload(request, storage ? 4 : 5);
  const extensions = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const name = `${avatar ? "avatar" : "upload"}-${randomUUID()}.${extensions[type]}`;
  if (storage) return storage.saveImage(name, type, data);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, name), data, { flag: "wx" });
  return { image: `/api/images/${name}` };
}

export async function readImageUpload(request, maxMB = 5) {
  const type = request.headers["content-type"]?.split(";")[0];
  const extensions = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  if (!extensions[type])
    throw new HttpError(415, "Choose a JPG, PNG, or WebP photo.");
  const limit = maxMB * 1024 * 1024;
  if (Number(request.headers["content-length"]) > limit)
    throw new HttpError(413, `Photo must be ${maxMB} MB or smaller.`);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > limit)
      throw new HttpError(413, `Photo must be ${maxMB} MB or smaller.`);
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  const valid =
    type === "image/png"
      ? data.length >= 24 &&
        data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        data.toString("ascii", 12, 16) === "IHDR"
      : type === "image/jpeg"
        ? data.length >= 4 &&
          data[0] === 255 &&
          data[1] === 216 &&
          data[2] === 255 &&
          data[data.length - 2] === 255 &&
          data[data.length - 1] === 217
        : data.length >= 20 &&
          data.toString("ascii", 0, 4) === "RIFF" &&
          data.toString("ascii", 8, 12) === "WEBP";
  if (!valid)
    throw new HttpError(
      400,
      "This file does not match the selected photo format.",
    );
  return { type, data };
}
