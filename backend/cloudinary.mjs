import { v2 as cloudinary } from "cloudinary";

export function cloudinaryConfigured(env = process.env) {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET,
  );
}

export function configureCloudinary(env = process.env) {
  if (!cloudinaryConfigured(env)) return false;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return true;
}

export async function verifyCloudinary(env = process.env) {
  if (!configureCloudinary(env)) return { configured: false, reachable: false };
  await cloudinary.api.ping();
  return { configured: true, reachable: true };
}

export { cloudinary };
