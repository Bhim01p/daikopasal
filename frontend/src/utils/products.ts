import type { Product } from "../types";
export const isSampleProduct = (product: Product) => product.isSample !== false;
export const purchaseLimit = (product: Product) =>
  product.available ? Math.min(10, product.stockQuantity ?? 0) : 0;
export const isIllustration = (product: Product) =>
  product.image.endsWith(".svg");
export const productImages = (product: Product) =>
  [...new Set([product.image, ...(product.images || [])])].slice(0, 6);
export const productImageSource = (product: Product) =>
  product.image === "/assets/phone.svg"
    ? product.catalogueImage?.url || "/assets/sample-phone-v1.png"
    : product.image;
