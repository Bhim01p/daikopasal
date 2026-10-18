import { cloudinary, configureCloudinary } from "./cloudinary.mjs";

export const phoneCatalogueImagePrefix =
  "machhapuchhree-electronics/catalogue/phones";

export function phoneCataloguePublicId(deviceId, position = 1) {
  return `${phoneCatalogueImagePrefix}/${deviceId}/${position === 1 ? "main" : position}`;
}

export async function uploadPhoneCatalogueImage(deviceId, file, position = 1) {
  if (!configureCloudinary()) throw new Error("Cloudinary configuration is incomplete.");
  return cloudinary.uploader.upload(file, {
    public_id: phoneCataloguePublicId(deviceId, position),
    overwrite: false,
    resource_type: "image",
  });
}

export async function uploadPhoneCatalogueBuffer(deviceId, data, position = 1, overwrite = false) {
  if (!configureCloudinary()) throw new Error("Cloudinary configuration is incomplete.");
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ public_id: phoneCataloguePublicId(deviceId, position), overwrite, resource_type: "image" }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(data);
  });
}
