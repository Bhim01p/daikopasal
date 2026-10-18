import { normalizeDigits } from "../shared/locale.mjs";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const categories = ["new", "used", "accessory"];
export const conditions = ["Like New", "Excellent", "Good", "Fair"];
export const statuses = [
  "Awaiting shop confirmation",
  "Confirmed",
  "Ready for pickup",
  "Completed",
  "Cancelled",
  "Preparing",
  "Out for delivery",
  "Delivered",
];
export const fulfillmentMethods = ["PICKUP", "DELIVERY"];
export const paymentMethods = ["PAY_AT_SHOP", "MANUAL_QR", "ESEWA"];
// PENDING_VERIFICATION remains accepted for orders created before the canonical
// VERIFICATION_PENDING status was introduced.
export const paymentStatuses = ["PENDING", "VERIFICATION_PENDING", "PENDING_VERIFICATION", "PAID", "FAILED", "REFUNDED", "REJECTED"];
export const accessoryCategories = [
  "Mobile Covers",
  "Chargers",
  "Earbuds",
  "Screen Protectors",
  "Speakers",
  "Earphones",
  "Bulbs",
  "Other Accessories",
];
export function text(value, label, min = 1, max = 200) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new HttpError(400, `${label} must be ${min}–${max} characters.`);
  return value.trim();
}
function integer(value, label, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new HttpError(400, `${label} is invalid.`);
  return value;
}
function validateImage(value) {
  const image = text(value, "Image", 1, 1000);
  if (/^https:\/\//.test(image)) {
    let url;
    try {
      url = new URL(image);
    } catch {
      throw new HttpError(400, "Invalid product image URL.");
    }
    if (
      [
        "i01.appmifile.com",
        "i02.appmifile.com",
        "cdsassets.apple.com",
      ].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      /\.(png|jpe?g|webp)$/.test(url.pathname)
    )
      return image;
  }
  if (
    !/^\/assets\/[a-zA-Z0-9_-]+\.(svg|png|jpe?g|webp)$/.test(image) &&
    !/^\/api\/images\/upload-[a-f0-9-]{36}\.(png|jpg|webp)$/.test(image)
  )
    throw new HttpError(
      400,
      "Use a local illustration or an uploaded product photo.",
    );
  return image;
}
export function validateProduct(input, existing) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(400, "Invalid product.");
  const name = text(input.name, "Product name", 2, 100);
  const brand = text(input.brand, "Brand", 1, 60);
  const category = input.category;
  if (!categories.includes(category))
    throw new HttpError(400, "Select a valid category.");
  const price = integer(input.price, "Price", 0, 100000000);
  const stockQuantity = integer(
    input.stockQuantity,
    "Stock quantity",
    0,
    1000000,
  );
  if (existing && input.stockVersion !== existing.stockVersion)
    throw new HttpError(
      409,
      "Stock changed while you were editing. Select the product again to review its current quantity.",
    );
  if (input.isSample !== undefined && typeof input.isSample !== "boolean")
    throw new HttpError(400, "Sample listing must be true or false.");
  if (
    input.priceIsEstimate !== undefined &&
    typeof input.priceIsEstimate !== "boolean"
  )
    throw new HttpError(400, "Invalid price confirmation.");
  const image = validateImage(input.image);
  const suppliedImages =
    input.images === undefined
      ? [
          image,
          ...(existing?.images || []).filter(
            (value) => value !== existing.image && value !== image,
          ),
        ]
      : input.images;
  if (
    !Array.isArray(suppliedImages) ||
    !suppliedImages.length ||
    suppliedImages.length > 6
  )
    throw new HttpError(400, "Use between one and six product photos.");
  const images = suppliedImages.map(validateImage);
  if (images[0] !== image || new Set(images).size !== images.length)
    throw new HttpError(
      400,
      "The first photo must be the cover image, and each photo must be different.",
    );
  const color = input.color || "#c1d4d1";
  if (!/^#[0-9a-f]{6}$/i.test(color))
    throw new HttpError(400, "Select a valid image background colour.");
  const specs = {};
  if (
    input.specs &&
    (typeof input.specs !== "object" || Array.isArray(input.specs))
  )
    throw new HttpError(400, "Invalid specifications.");
  if (Object.keys(input.specs || {}).length > 20)
    throw new HttpError(400, "Too many specifications.");
  for (const [key, value] of Object.entries(input.specs || {}))
    specs[text(key, "Specification name", 1, 50)] = text(
      value,
      "Specification",
      1,
      200,
    );
  const result = {
    id: existing?.id,
    slug: existing?.slug,
    name,
    brand,
    category,
    price,
    image,
    images,
    color,
    available: stockQuantity > 0,
    stockQuantity,
    stockVersion: existing ? existing.stockVersion + 1 : 0,
    isSample: input.isSample ?? existing?.isSample ?? false,
    priceIsEstimate:
      input.priceIsEstimate ?? existing?.priceIsEstimate ?? false,
    description: text(input.description, "Description", 1, 2000),
    descriptionNe: text(
      input.descriptionNe ?? existing?.descriptionNe ?? "",
      "Nepali description",
      0,
      2000,
    ),
    specs,
    added: existing?.added || Date.now(),
    reviewedAt: existing?.reviewedAt || null,
  };
  result.specVariant = text(
    input.specVariant ?? existing?.specVariant ?? "",
    "Model variant",
    0,
    180,
  );
  result.specSourceUrl = text(
    input.specSourceUrl ?? existing?.specSourceUrl ?? "",
    "Specification URL",
    0,
    500,
  );
  if (result.specSourceUrl) {
    let url;
    try {
      url = new URL(result.specSourceUrl);
    } catch {
      throw new HttpError(400, "Use a valid HTTPS specification source URL.");
    }
    if (url.protocol !== "https:" || url.username || url.password)
      throw new HttpError(400, "Use a valid HTTPS specification source URL.");
  }
  const emi = input.emi ?? existing?.emi;
  if (emi !== undefined) {
    if (
      !emi ||
      typeof emi !== "object" ||
      Array.isArray(emi) ||
      typeof emi.enabled !== "boolean"
    )
      throw new HttpError(400, "Invalid EMI terms.");
    if (emi.enabled && category !== "accessory") {
      if (
        ![emi.annualRate, emi.minimumDownPercent, emi.fee].every(
          Number.isFinite,
        ) ||
        emi.annualRate < 0 ||
        emi.annualRate > 100 ||
        emi.minimumDownPercent < 0 ||
        emi.minimumDownPercent >= 100 ||
        emi.fee < 0 ||
        emi.fee > 10000000 ||
        !["flat", "reducing"].includes(emi.method) ||
        !Array.isArray(emi.months) ||
        !emi.months.length ||
        emi.months.length > 12 ||
        new Set(emi.months).size !== emi.months.length ||
        emi.months.some((m) => !Number.isInteger(m) || m < 1 || m > 120) ||
        price <= 0
      )
        throw new HttpError(400, "Invalid EMI terms.");
      result.emi = {
        enabled: true,
        annualRate: emi.annualRate,
        minimumDownPercent: emi.minimumDownPercent,
        fee: emi.fee,
        method: emi.method,
        months: [...emi.months].sort((a, b) => a - b),
      };
    } else result.emi = { enabled: false };
  }
  if (category !== "accessory") {
    delete result.specs.Category;
    const catalogueStorageMayBeMissing = Boolean(input.catalogueDeviceId);
    if (catalogueStorageMayBeMissing && input.storage === undefined) {
      delete result.storage;
      delete result.specs.Storage;
    } else {
      result.storage = integer(input.storage, "Storage", 16, 2048);
      result.specs.Storage = `${result.storage} GB`;
    }
    if (input.ram !== undefined) result.ram = integer(input.ram, "RAM", 1, 64);
    if (result.ram) result.specs.RAM = `${result.ram} GB`;
  } else {
    delete result.specs.RAM;
    delete result.specs.Storage;
    if (!accessoryCategories.includes(input.accessoryCategory))
      throw new HttpError(400, "Select an accessory category.");
    result.accessoryCategory = input.accessoryCategory;
    result.specs.Category = input.accessoryCategory;
  }
  if (category === "used") {
    if (input.condition !== undefined && input.condition !== "") {
      if (!conditions.includes(input.condition))
        throw new HttpError(400, "Select a phone condition.");
      result.condition = input.condition;
    }
    if (input.battery !== undefined && input.battery !== null && input.battery !== "")
      result.battery = integer(input.battery, "Battery health", 0, 100);
    const inspection = input.inspection ?? existing?.inspection ?? {};
    if (!inspection || typeof inspection !== "object" || Array.isArray(inspection))
      throw new HttpError(400, "Invalid used-phone inspection.");
    const checks = {};
    for (const key of ["screen", "cameras", "charging", "speakers", "buttons"]) {
      const value = inspection.checks?.[key] || "not_checked";
      if (!["not_checked", "passed", "issue"].includes(value))
        throw new HttpError(400, "Invalid used-phone inspection status.");
      checks[key] = value;
    }
    result.inspection = {
      checks,
      defects: text(inspection.defects || "", "Known defects", 0, 500),
      included: text(inspection.included || "", "Included accessories", 0, 300),
      inspectedAt: existing?.inspection?.inspectedAt || null,
    };
  }
  return result;
}
export function validateCustomer(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(400, "Invalid order.");
  const name = text(input.name, "Full name", 2, 100);
  const email = text(input.email, "Email address", 3, 254);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    throw new HttpError(400, "Enter a valid email address for order updates.");
  const phone = text(normalizeDigits(input.phone), "Phone", 10, 20).replace(
    /[\s()-]/g,
    "",
  );
  if (!/^(?:\+977|977)?9[78]\d{8}$/.test(phone))
    throw new HttpError(400, "Enter a valid Nepal mobile number.");
  const note =
    input.note === undefined || input.note === ""
      ? ""
      : text(input.note, "Note", 0, 1000);
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 50
  )
    throw new HttpError(400, "Add at least one product to your bag.");
  const seen = new Set();
  const items = input.items.map((item) => {
    const productId = text(item?.productId, "Product ID", 1, 100);
    if (seen.has(productId))
      throw new HttpError(400, "Duplicate product in order.");
    seen.add(productId);
    return { productId, quantity: integer(item.quantity, "Quantity", 1, 10) };
  });
  const requestId = text(input.requestId, "Request reference", 16, 100);
  const fulfillmentMethod = input.fulfillmentMethod === "DELIVERY" ? "DELIVERY" : "PICKUP";
  const paymentMethod = ["MANUAL_QR", "ESEWA"].includes(input.paymentMethod) ? input.paymentMethod : "PAY_AT_SHOP";
  if (fulfillmentMethod === "DELIVERY" && !["MANUAL_QR", "ESEWA"].includes(paymentMethod))
    throw new HttpError(400, "Delivery orders must use QR or online payment.");
  const deliveryAddress = input.deliveryAddress;
  if (fulfillmentMethod === "DELIVERY") {
    if (!deliveryAddress || typeof deliveryAddress !== "object" || Array.isArray(deliveryAddress))
      throw new HttpError(400, "Enter your delivery address.");
    for (const key of ["province", "district", "city", "area", "address"])
      text(deliveryAddress[key], `Delivery ${key}`, 2, 200);
    if (deliveryAddress.landmark) text(deliveryAddress.landmark, "Landmark", 0, 200);
    if (deliveryAddress.notes) text(deliveryAddress.notes, "Delivery notes", 0, 500);
  }
  return {
    name,
    email,
    phone,
    note,
    items,
    requestId,
    language: input.language === "ne" ? "ne" : "en",
    fulfillmentMethod,
    paymentMethod,
    deliveryAddress: fulfillmentMethod === "DELIVERY" ? {
      province: text(deliveryAddress.province, "Province", 2, 100),
      district: text(deliveryAddress.district, "District", 2, 100),
      city: text(deliveryAddress.city, "City / municipality", 2, 120),
      area: text(deliveryAddress.area, "Area / tole", 2, 160),
      address: text(deliveryAddress.address, "Full address", 2, 300),
      ...(deliveryAddress.landmark ? { landmark: text(deliveryAddress.landmark, "Landmark", 0, 200) } : {}),
      ...(deliveryAddress.notes ? { notes: text(deliveryAddress.notes, "Delivery notes", 0, 500) } : {}),
    } : null,
  };
}
