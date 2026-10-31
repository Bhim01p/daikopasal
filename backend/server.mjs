import http from "node:http";
import {
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { loadEnvFile } from "node:process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore, defaultStorePath } from "./store.mjs";
import { stateMap } from "./state-map.mjs";
import { bufferedResponse } from "./buffered-response.mjs";
import { saveProductImage, readImageUpload } from "./images.mjs";
import { uploadPhoneCatalogueBuffer } from "./phone-catalogue-images.mjs";
import { publicStaff, saveStaff } from "./staff.mjs";
import { previewInventory, replaceSamples } from "./catalogue.mjs";
import {
  publicReferencePhones,
  adminPhoneCatalogue,
  catalogueSpecsForProduct,
} from "./phone-reference.mjs";
import { issueBill, billPdf } from "./billing.mjs";
import {
  createCustomerAuth,
  publicCustomer,
  profileComplete,
  normalizePhone,
} from "./customer-auth.mjs";
import {
  createOrderEmail,
  createPasswordChangedEmail,
  createEmailTransport,
  createEmailWorker,
  emailSummary,
} from "./email.mjs";
import {
  HttpError,
  text,
  validateProduct,
  validateCustomer,
  statuses,
} from "./validation.mjs";
import { createPayment, paymentProvider, updatePayment } from "./payments.mjs";
import { catalogueImageForProduct } from "./catalogue-images.mjs";
import { catalogueDescriptionForProduct } from "./phone-descriptions.mjs";
import {
  effectiveCatalogue,
  readCatalogueOverrides,
  saveCatalogueOverride,
  resetCatalogueOverride,
} from "./catalogue-overrides.mjs";

function staffPermissionForRoute(route) {
  if (route.startsWith("/api/admin/orders")) return "orders";
  if (route.startsWith("/api/admin/sales")) return "sales";
  if (route.startsWith("/api/admin/bills")) return "billing";
  if (
    route.startsWith("/api/admin/products") ||
    route.startsWith("/api/admin/catalogue") ||
    route === "/api/admin/images" ||
    route === "/api/admin/phone-catalogue"
  )
    return "inventory";
  if (route.startsWith("/api/admin/repairs")) return "repairs";
  if (route.startsWith("/api/admin/payment-config")) return "paymentQr";
  return null;
}
const backendRoot = path.dirname(fileURLToPath(import.meta.url));
if (existsSync(path.join(backendRoot, ".env")))
  loadEnvFile(path.join(backendRoot, ".env"));
const sessionDuration = 60 * 60 * 1000;
function equal(a, b) {
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));
  return first.length === second.length && timingSafeEqual(first, second);
}
function json(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}
function xml(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control":
      "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(data);
}
function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
async function body(request) {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new HttpError(415, "Send JSON content.");
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 65536) throw new HttpError(413, "Request is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
function publicOrder(order) {
  const {
    requestId,
    fingerprint,
    customerId,
    stockReserved,
    handover,
    payment,
    ...receipt
  } = order;
  if (customerId) delete receipt.receiptToken;
  const { verifiedBy, reviewedBy, ...publicPayment } = payment || {};
  return {
    ...receipt,
    ...(payment ? { payment: publicPayment } : {}),
    ...(handover ? { handover: { date: handover.date } } : {}),
    accountOrder: !!customerId,
  };
}
function publicProduct(product) {
  const publicFields = [
    "id",
    "slug",
    "name",
    "brand",
    "category",
    "price",
    "ram",
    "storage",
    "catalogueDeviceId",
    "variantKey",
    "image",
    "images",
    "color",
    "available",
    "stockQuantity",
    "stockVersion",
    "isSample",
    "priceIsEstimate",
    "description",
    "descriptionNe",
    "specs",
    "condition",
    "battery",
    "reviewedAt",
    "accessoryCategory",
    "specVariant",
    "specSourceUrl",
    "added",
  ];
  const result = Object.fromEntries(
    publicFields
      .filter((key) => product[key] !== undefined)
      .map((key) => [key, product[key]]),
  );
  if (product.inspection) {
    const checkNames = [
      "screen",
      "body",
      "cameras",
      "charging",
      "speakers",
      "microphone",
      "buttons",
      "biometrics",
      "network",
      "wireless",
    ];
    result.inspection = {
      checks: Object.fromEntries(
        checkNames.map((key) => [
          key,
          ["not_checked", "passed", "issue"].includes(
            product.inspection.checks?.[key],
          )
            ? product.inspection.checks[key]
            : "not_checked",
        ]),
      ),
      defects:
        typeof product.inspection.defects === "string"
          ? product.inspection.defects
          : "",
      included:
        typeof product.inspection.included === "string"
          ? product.inspection.included
          : "",
      ...(product.inspection.inspectedAt
        ? { inspectedAt: product.inspection.inspectedAt }
        : {}),
    };
  }
  if (product.emi) {
    result.emi = {
      enabled: product.emi.enabled === true,
      ...(product.emi.enabled === true
        ? {
            annualRate: product.emi.annualRate,
            months: product.emi.months,
            minimumDownPercent: product.emi.minimumDownPercent,
            fee: product.emi.fee,
            method: product.emi.method,
          }
        : {}),
    };
  }
  return result;
}
function adminOrder(order) {
  const { receiptToken, ...receipt } = publicOrder(order);
  return {
    ...receipt,
    ...(order.payment ? { payment: order.payment } : {}),
    ...(order.handover ? { handover: order.handover } : {}),
  };
}
function requiresRecentAdminAuth(route, method) {
  if (!["POST", "PATCH", "DELETE"].includes(method)) return false;
  return (
    route === "/api/admin/staff" ||
    route.startsWith("/api/admin/staff/") ||
    route === "/api/admin/payment-config" ||
    route === "/api/admin/payment-config/image" ||
    /^\/api\/admin\/orders\/[^/]+\/payment$/.test(route) ||
    route === "/api/admin/catalogue/replace-samples"
  );
}
function validateCatalogueGrouping(product) {
  if (!product.catalogueDeviceId) return product;
  if (product.category !== "new")
    throw new HttpError(
      400,
      "Catalogue grouping is only available for new phones.",
    );
  const known = adminPhoneCatalogue().some(
    (phone) => phone.deviceId === product.catalogueDeviceId,
  );
  if (!known) throw new HttpError(400, "Select a valid catalogue device.");
  return product;
}
function publicRepairTicket(ticket) {
  return {
    id: ticket.id,
    device: ticket.device,
    deviceType: ticket.deviceType,
    issueCategory: ticket.issueCategory,
    problem: ticket.problem,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    diagnosis: ticket.diagnosis || "",
    estimatedCost: Number.isFinite(ticket.estimatedCost)
      ? ticket.estimatedCost
      : null,
    finalCost: Number.isFinite(ticket.finalCost) ? ticket.finalCost : null,
    approval: ticket.approval || "NOT_REQUIRED",
    customerUpdate: ticket.customerUpdate || "",
    history: (ticket.history || []).map(({ status, date, message }) => ({
      status,
      date,
      ...(message ? { message } : {}),
    })),
  };
}
const repairStatuses = [
  "Request Received",
  "Device Received",
  "Diagnosing",
  "Awaiting Customer Approval",
  "Repairing",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
  "Unrepairable",
  "Received",
  "Inspecting",
  "Awaiting approval",
  "Ready",
  "Collected",
];
const repairTransitions = {
  "Request Received": ["Device Received", "Cancelled", "Unrepairable"],
  "Device Received": ["Diagnosing", "Cancelled", "Unrepairable"],
  Diagnosing: [
    "Awaiting Customer Approval",
    "Repairing",
    "Cancelled",
    "Unrepairable",
  ],
  "Awaiting Customer Approval": ["Repairing", "Cancelled", "Unrepairable"],
  Repairing: ["Ready for Pickup", "Cancelled", "Unrepairable"],
  "Ready for Pickup": ["Completed"],
  Completed: [],
  Cancelled: [],
  Unrepairable: [],
};
function canRepairTransition(from, to) {
  if (from === to) return true;
  if (repairTransitions[from]?.includes(to)) return true;
  const legacy = {
    Received: "Device Received",
    Inspecting: "Diagnosing",
    "Awaiting approval": "Awaiting Customer Approval",
    Repairing: "Repairing",
    Ready: "Ready for Pickup",
    Collected: "Completed",
    Cancelled: "Cancelled",
  };
  return legacy[from] ? repairTransitions[legacy[from]]?.includes(to) : false;
}
async function sendBill(response, bill) {
  const pdf = await billPdf(bill);
  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${bill.id}.pdf"`,
    "Content-Length": pdf.length,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(pdf);
}
export function createApp(options = {}) {
  const adminNow = options.adminNow || Date.now;
  const dataFile =
    options.dataFile || process.env.DATA_FILE || defaultStorePath;
  const store =
    options.store ||
    createStore(dataFile, {
      initialProducts: options.initialProducts,
      migrateStarter: options.migrateStarter,
    });
  const emailTransport =
    options.emailTransport === undefined
      ? createEmailTransport()
      : options.emailTransport;
  const customerAuth = createCustomerAuth(store, {
    mode: options.customerAuthMode,
    emailTransport,
    // Legacy transport injection remains for regression tests; deployed app never creates an SMS sender.
    smsTransport: options.smsTransport || null,
    now: options.customerNow,
  });
  const emailWorker = createEmailWorker(store, emailTransport, {
    automatic: !options.serverless,
  });
  function sendQueuedEmails() {
    if (store.transaction) return; // Drain after the request has committed.
    void emailWorker
      .drain()
      .catch(() => console.error("Email queue could not be processed."));
  }
  const imageDirectory = path.join(
    path.dirname(path.resolve(dataFile)),
    "images",
  );
  const username = options.username || process.env.ADMIN_USERNAME || "admin";
  const passwordHash =
    options.passwordHash || process.env.ADMIN_PASSWORD_HASH || "";
  const [salt, hash] = passwordHash.split(":");
  const configured =
    /^[a-f0-9]{32}$/.test(salt || "") && /^[a-f0-9]{128}$/.test(hash || "");
  const sessions = stateMap(store, "adminSessions");
  const attempts = stateMap(store, "adminAttempts");
  const adminChallenges = stateMap(store, "adminChallenges");
  const adminMfaLimits = stateMap(store, "adminMfaLimits");
  const orderEmailLimits = stateMap(store, "orderEmailLimits");
  const sessionKey = (token) =>
    createHash("sha256").update(token).digest("hex");
  function limitOrderEmails(request, email) {
    const now = Date.now();
    for (const [key, value] of orderEmailLimits)
      if (value.until <= now) orderEmailLimits.delete(key);
    const limits = [
      [`ip:${request.clientIp || request.socket.remoteAddress}`, 20],
      [`email:${email.toLowerCase()}`, 5],
    ];
    for (const [key, maximum] of limits) {
      if ((orderEmailLimits.get(key)?.count || 0) >= maximum)
        throw new HttpError(
          429,
          "Too many order requests. Please wait 15 minutes or contact the shop.",
        );
    }
    for (const [key] of limits) {
      const current = orderEmailLimits.get(key);
      orderEmailLimits.set(key, {
        count: (current?.count || 0) + 1,
        until: current?.until || now + 15 * 60 * 1000,
      });
    }
  }
  function setCookie(
    response,
    token,
    maxAge = sessionDuration / 1000,
    request,
  ) {
    const secureCookie =
      process.env.COOKIE_SECURE === "true" ||
      process.env.NODE_ENV === "production" ||
      request?.headers["x-forwarded-proto"] === "https";
    response.setHeader(
      "Set-Cookie",
      `me_admin=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${secureCookie ? "; Secure" : ""}`,
    );
  }
  function issueAdminSession(request, response, { username, role, staff }) {
    const token = randomBytes(32).toString("hex");
    sessions.set(sessionKey(token), {
      username,
      role,
      ...(staff
        ? {
            staffId: staff.id,
            accessVersion: staff.accessVersion,
            permissions: staff.permissions || {},
          }
        : {}),
      credentialHash: role === "owner" ? passwordHash : staff.passwordHash,
      authAt: adminNow(),
      expires: adminNow() + sessionDuration,
    });
    setCookie(response, token, sessionDuration / 1000, request);
    return { username, role, permissions: staff?.permissions || {} };
  }
  function session(request) {
    const token = request.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("me_admin="))
      ?.slice(9);
    if (!token) return null;
    const value = sessions.get(sessionKey(token));
    const staff =
      value?.role === "staff"
        ? (store.read().staffAccounts || []).find(
            (account) => account.id === value.staffId,
          )
        : null;
    const credentialsMatch =
      value?.role === "staff"
        ? staff?.enabled &&
          staff.username === value.username &&
          staff.passwordHash === value.credentialHash &&
          staff.accessVersion === value.accessVersion
        : configured &&
          value?.username === username &&
          value?.credentialHash === passwordHash;
    if (!value || value.expires <= adminNow() || !credentialsMatch) {
      sessions.delete(sessionKey(token));
      return null;
    }
    return { token, ...value, role: value.role || "owner" };
  }
  async function handleRequest(request, response) {
    try {
      const url = new URL(request.url, "http://localhost");
      const route = url.pathname;
      const method = request.method;
      if (
        route.startsWith("/api") &&
        ["POST", "PATCH", "DELETE", "PUT"].includes(method)
      ) {
        const origin = request.headers.origin;
        if (origin && new URL(origin).host !== request.headers.host)
          throw new HttpError(403, "This request origin is not allowed.");
      }
      if (route === "/api/sitemap.xml" && method === "GET") {
        const publicOrigin = "https://machhapuchhreeelectronics.vercel.app";
        const publicPaths = [
          "/",
          "/mobiles",
          "/second-hand",
          "/accessories",
          "/repair",
          "/mobile-repair",
          "/digital-meter-repair",
          "/shop",
          "/help",
        ];
        const productSlugs = new Set(
          store
            .read()
            .products.filter(
              (product) =>
                product.isSample === false &&
                typeof product.slug === "string" &&
                product.slug.trim(),
            )
            .map((product) => product.slug.trim()),
        );
        const locations = [
          ...publicPaths.map((pathname) => `${publicOrigin}${pathname}`),
          ...[...productSlugs].map(
            (slug) => `${publicOrigin}/product/${encodeURIComponent(slug)}`,
          ),
        ];
        const entries = locations
          .map((location) => `<url><loc>${escapeXml(location)}</loc></url>`)
          .join("");
        return xml(
          response,
          200,
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,
        );
      }
      if (route === "/api/health" && method === "GET")
        return json(response, 200, { ok: true });
      if (route === "/api/products" && method === "GET")
        return json(response, 200, {
          products: store.read().products.map((product) => ({
            ...publicProduct(product),
            catalogueImage: catalogueImageForProduct(product),
            catalogueDescription:
              product.category === "new"
                ? catalogueDescriptionForProduct(product)
                : undefined,
            catalogueSpecs:
              product.category === "new"
                ? catalogueSpecsForProduct(product)
                : undefined,
          })),
        });
      if (route === "/api/reference-phones" && method === "GET")
        return json(response, 200, {
          phones: publicReferencePhones(store.read()),
        });
      if (route === "/api/customer/session" && method === "GET")
        return json(response, 200, {
          customer: publicCustomer(customerAuth.session(request)?.customer),
          mode: customerAuth.mode(request),
        });
      if (route === "/api/customer/auth/start" && method === "POST")
        return json(
          response,
          200,
          await customerAuth.start(request, await body(request)),
        );
      if (route === "/api/customer/auth/verify" && method === "POST")
        return json(response, 200, {
          customer: customerAuth.verify(request, response, await body(request)),
        });
      if (route === "/api/customer/logout" && method === "POST") {
        customerAuth.logout(request, response);
        return json(response, 200, { ok: true });
      }
      if (route === "/api/customer/logout-all" && method === "POST") {
        customerAuth.logoutAll(request, response);
        return json(response, 200, { ok: true });
      }
      if (route === "/api/customer/auth/password" && method === "POST")
        return json(response, 200, {
          customer: customerAuth.passwordLogin(
            request,
            response,
            await body(request),
          ),
        });
      if (route === "/api/customer/password" && method === "POST") {
        const previousCustomer = customerAuth.session(request)?.customer;
        const customer = customerAuth.setPassword(
          request,
          response,
          await body(request),
        );
        const securityEmail = createPasswordChangedEmail(previousCustomer);
        if (securityEmail) {
          const current = store.read();
          store.commit({
            ...current,
            emailQueue: [...current.emailQueue, securityEmail],
          });
          sendQueuedEmails();
        }
        return json(response, 200, { customer });
      }
      if (
        route === "/api/customer/photo" &&
        ["GET", "POST", "DELETE"].includes(method)
      ) {
        const { customer } = customerAuth.requireSession(request);
        const validName = (name) =>
          /^avatar-[a-f0-9-]{36}\.(png|jpg|webp)$/.test(name || "");
        if (method === "GET") {
          if (!validName(customer.photo))
            throw new HttpError(404, "Photo not found.");
          const stored = store.readImage
            ? await store.readImage(customer.photo)
            : null;
          const file = path.join(imageDirectory, customer.photo);
          if (!stored && (store.readImage || !existsSync(file)))
            throw new HttpError(404, "Photo not found.");
          response.writeHead(200, {
            "Content-Type":
              stored?.content_type ||
              { png: "image/png", jpg: "image/jpeg", webp: "image/webp" }[
                customer.photo.split(".").pop()
              ],
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          });
          return response.end(stored?.data || readFileSync(file));
        }
        let photo = "";
        if (method === "POST") {
          const now = Date.now();
          const limits = stateMap(store, "customerPhotoLimits");
          const limit = limits.get(customer.id);
          if (limit && limit.until > now && limit.count >= 10)
            throw new HttpError(
              429,
              "Too many photo uploads. Please try again tomorrow.",
            );
          const uploaded = await saveProductImage(
            request,
            imageDirectory,
            store.saveImage ? store : undefined,
            { avatar: true },
          );
          photo = uploaded.image.split("/").pop();
          limits.set(customer.id, {
            count: limit && limit.until > now ? limit.count + 1 : 1,
            until: limit && limit.until > now ? limit.until : now + 86400000,
          });
        }
        const updated = customerAuth.updatePhoto(request, photo);
        if (validName(customer.photo)) {
          if (store.deleteImage) await store.deleteImage(customer.photo);
          else {
            const file = path.join(imageDirectory, customer.photo);
            if (existsSync(file)) unlinkSync(file);
          }
        }
        return json(response, 200, { customer: updated });
      }
      if (route === "/api/customer/profile" && method === "PATCH")
        return json(response, 200, {
          customer: customerAuth.updateProfile(request, await body(request)),
        });
      if (route === "/api/customer/orders" && method === "GET") {
        const { customer } = customerAuth.requireSession(request);
        return json(response, 200, {
          orders: store
            .read()
            .orders.filter((order) => order.customerId === customer.id)
            .map((order) => ({
              ...publicOrder(order),
              billIssued: store
                .read()
                .bills.some((bill) => bill.orderId === order.id),
            }))
            .sort((a, b) => b.date.localeCompare(a.date)),
        });
      }
      if (route === "/api/customer/repairs" && method === "GET") {
        const { customer } = customerAuth.requireSession(request);
        return json(response, 200, {
          tickets: store
            .read()
            .repairTickets.filter((ticket) => ticket.customerId === customer.id)
            .slice()
            .reverse()
            .map(publicRepairTicket),
        });
      }
      if (route === "/api/customer/repairs/claim" && method === "POST") {
        const { customer } = customerAuth.requireSession(request);
        const input = await body(request);
        const phone = normalizePhone(input?.phone);
        const code = text(input?.code, "Repair code", 6, 6);
        if (!/^\d{6}$/.test(code))
          throw new HttpError(400, "Enter the six-digit repair code.");
        const current = store.read();
        const now = Date.now();
        const limits = current.repairClaimLimits || {};
        const limit = limits[phone];
        if (limit && limit.count >= 5 && now - limit.since < 15 * 60_000)
          throw new HttpError(
            429,
            "Too many attempts. Try again in 15 minutes.",
          );
        const ticket = current.repairTickets.find((entry) => {
          try {
            return (
              normalizePhone(entry.phone) === phone &&
              entry.claimCode &&
              equal(entry.claimCode, code) &&
              !entry.customerId
            );
          } catch {
            return false;
          }
        });
        if (!ticket) {
          store.commit({
            ...current,
            repairClaimLimits: {
              ...limits,
              [phone]:
                limit && now - limit.since < 15 * 60_000
                  ? { since: limit.since, count: limit.count + 1 }
                  : { since: now, count: 1 },
            },
          });
          throw new HttpError(
            404,
            "Repair not found. Check the phone number and code.",
          );
        }
        const updated = { ...ticket, customerId: customer.id, claimCode: null };
        const nextLimits = { ...limits };
        delete nextLimits[phone];
        store.commit({
          ...current,
          repairClaimLimits: nextLimits,
          repairTickets: current.repairTickets.map((entry) =>
            entry.id === ticket.id ? updated : entry,
          ),
        });
        return json(response, 200, { ticket: publicRepairTicket(updated) });
      }
      if (route === "/api/repairs" && method === "POST") {
        const input = await body(request);
        const limits = stateMap(store, "repairRequestLimits");
        const key = `ip:${request.clientIp || request.socket.remoteAddress || "local"}`;
        const now = Date.now();
        const limit = limits.get(key);
        if (limit && limit.until > now && limit.count >= 5)
          throw new HttpError(
            429,
            "Too many repair requests. Please wait 15 minutes before trying again.",
          );
        limits.set(key, {
          count: limit && limit.until > now ? limit.count + 1 : 1,
          until:
            limit && limit.until > now ? limit.until : now + 15 * 60 * 1000,
        });
        const deviceType = input.deviceType;
        if (!["mobile", "meter"].includes(deviceType))
          throw new HttpError(400, "Select a valid device type.");
        const brand = text(input.brand, "Brand or device maker", 1, 60);
        const model = text(
          input.model,
          "Model or vehicle identification",
          2,
          120,
        );
        const issueCategories = [
          "screen",
          "battery",
          "charging",
          "camera",
          "audio",
          "software",
          "network",
          "buttons",
          "water",
          "meter",
          "other",
        ];
        const issueCategory = input.issueCategory;
        if (!issueCategories.includes(input.issueCategory))
          throw new HttpError(400, "Select a repair problem category.");
        const customerName = text(input.customerName, "Full name", 2, 100);
        const phone = normalizePhone(input.phone);
        const preferredContact = input.preferredContact;
        if (!["call", "whatsapp"].includes(preferredContact))
          throw new HttpError(400, "Select a preferred contact method.");
        const whatsappNumber = input.whatsappSameAsPhone
          ? phone
          : input.whatsapp
            ? normalizePhone(input.whatsapp)
            : "";
        const description =
          input.description === undefined || input.description === ""
            ? ""
            : text(input.description, "Problem description", 0, 500);
        const current = store.read();
        const id = `ME-R${String(current.repairTickets.length + 1).padStart(6, "0")}`;
        const token = randomBytes(32).toString("hex");
        const customerId = customerAuth.session(request)?.customer?.id;
        const date = new Date().toISOString();
        const ticket = {
          id,
          token,
          customerId,
          customerName,
          phone,
          whatsappNumber,
          preferredContact,
          deviceType,
          brand,
          model,
          device: `${brand} ${model}`.trim(),
          issueCategory,
          problem: description || issueCategory,
          description,
          status: "Request Received",
          createdAt: date,
          updatedAt: date,
          history: [{ status: "Request Received", date }],
        };
        store.commit({
          ...current,
          repairTickets: [...current.repairTickets, ticket],
        });
        return json(response, 201, {
          ticket: publicRepairTicket(ticket),
          trackingToken: token,
        });
      }
      const customerBill = route.match(/^\/api\/orders\/([^/]+)\/bill$/);
      if (customerBill && method === "GET") {
        const order = store
          .read()
          .orders.find((item) => item.id === customerBill[1]);
        if (
          !order ||
          (order.customerId
            ? customerAuth.session(request)?.customer.id !== order.customerId
            : !equal(
                request.headers["x-order-token"] || "",
                order.receiptToken,
              ))
        )
          throw new HttpError(404, "Bill not found.");
        const bill = store
          .read()
          .bills.find((item) => item.orderId === order.id);
        if (!bill) throw new HttpError(404, "Bill has not been issued yet.");
        return sendBill(response, bill);
      }
      const repairLookup = route.match(/^\/api\/repairs\/([^/]+)$/);
      if (repairLookup && method === "GET") {
        const ticket = store
          .read()
          .repairTickets.find((item) => item.id === repairLookup[1]);
        if (
          !ticket ||
          !equal(request.headers["x-repair-token"] || "", ticket.token)
        )
          throw new HttpError(404, "Repair ticket not found.");
        return json(response, 200, { ticket: publicRepairTicket(ticket) });
      }
      const repairDecision = route.match(/^\/api\/repairs\/([^/]+)\/decision$/);
      if (repairDecision && method === "POST") {
        const input = await body(request);
        const current = store.read();
        const ticket = current.repairTickets.find(
          (item) => item.id === repairDecision[1],
        );
        if (
          !ticket ||
          !equal(request.headers["x-repair-token"] || "", ticket.token)
        )
          throw new HttpError(404, "Repair ticket not found.");
        if (
          ticket.status !== "Awaiting Customer Approval" &&
          ticket.status !== "Awaiting approval"
        )
          throw new HttpError(
            409,
            "Repair approval is not currently requested.",
          );
        if (!["APPROVED", "DECLINED"].includes(input.decision))
          throw new HttpError(400, "Select a valid repair decision.");
        const date = new Date().toISOString();
        const updated = {
          ...ticket,
          approval: input.decision,
          approvalAt: date,
          customerUpdate:
            input.decision === "APPROVED"
              ? "Repair approved by customer."
              : "Repair declined by customer.",
          updatedAt: date,
          history: [
            ...(ticket.history || []),
            {
              status: ticket.status,
              date,
              message:
                input.decision === "APPROVED"
                  ? "Repair approved by customer."
                  : "Repair declined by customer.",
            },
          ],
        };
        store.commit({
          ...current,
          repairTickets: current.repairTickets.map((item) =>
            item.id === ticket.id ? updated : item,
          ),
        });
        return json(response, 200, { ticket: publicRepairTicket(updated) });
      }
      if (route === "/api/admin/session" && method === "GET") {
        const active = session(request);
        return json(response, 200, {
          user: active
            ? {
                username: active.username,
                role: active.role,
                permissions: active.permissions || {},
              }
            : null,
          configured,
        });
      }
      if (route === "/api/payment-config" && method === "GET")
        return json(response, 200, {
          config: store.read().paymentConfig || {
            qrImage: "",
            instructions: "",
            accountName: "",
          },
        });
      if (route === "/api/admin/login" && method === "POST") {
        if (!configured)
          throw new HttpError(
            503,
            "Admin access is not configured. Run npm run admin:setup.",
          );
        const key = request.clientIp || request.socket.remoteAddress || "local";
        for (const [address, value] of attempts)
          if (value.until < Date.now()) attempts.delete(address);
        const attempt = attempts.get(key);
        if (attempt && attempt.count >= 5)
          throw new HttpError(
            429,
            "Too many login attempts. Try again in 15 minutes.",
          );
        const input = await body(request);
        const password = text(input?.password, "Password", 1, 200);
        const login = text(input?.username, "Username", 1, 100);
        const owner = equal(login, username);
        const staff = owner
          ? null
          : (store.read().staffAccounts || []).find(
              (account) =>
                account.username.toLowerCase() === login.toLowerCase(),
            );
        const credential = owner
          ? passwordHash
          : staff?.passwordHash || passwordHash;
        const [loginSalt, loginHash] = credential.split(":");
        const candidate = scryptSync(password, loginSalt, 64).toString("hex");
        if ((!owner && !staff?.enabled) || !equal(candidate, loginHash)) {
          attempts.set(key, {
            count: (attempt?.count || 0) + 1,
            until: attempt?.until || Date.now() + 15 * 60 * 1000,
          });
          throw new HttpError(401, "Incorrect username or password.");
        }
        attempts.delete(key);
        for (const [key, value] of sessions)
          if (value.expires <= adminNow()) sessions.delete(key);
        const accountUsername = owner ? username : staff.username;
        const role = owner ? "owner" : "staff";
        const mfaEmail = process.env.ADMIN_MFA_EMAIL?.trim().toLowerCase();
        if (mfaEmail) {
          if (!emailTransport)
            throw new HttpError(
              503,
              "Admin email verification is configured, but email delivery is unavailable.",
            );
          const now = adminNow();
          for (const [id, challenge] of adminChallenges)
            if (challenge.expiresAt <= now) adminChallenges.delete(id);
          for (const [id, limit] of adminMfaLimits)
            if (limit.until <= now) adminMfaLimits.delete(id);
          const mfaKeys = [
            [
              `ip:${request.clientIp || request.socket.remoteAddress || "local"}`,
              10,
            ],
            [`mailbox:${mfaEmail}`, 40],
          ];
          for (const [limitKey, maximum] of mfaKeys)
            if ((adminMfaLimits.get(limitKey)?.count || 0) >= maximum)
              throw new HttpError(
                429,
                "Too many admin verification codes were requested. Try again later.",
              );
          for (const [limitKey] of mfaKeys) {
            const current = adminMfaLimits.get(limitKey);
            adminMfaLimits.set(limitKey, {
              count: (current?.count || 0) + 1,
              until: current?.until || now + 60 * 60 * 1000,
            });
          }
          const challengeId = randomBytes(24).toString("hex");
          const code = randomInt(100000, 1000000).toString();
          adminChallenges.set(challengeId, {
            codeHash: createHash("sha256")
              .update(`${challengeId}:${code}`)
              .digest("hex"),
            username: accountUsername,
            role,
            credentialHash: credential,
            ...(staff
              ? { staffId: staff.id, accessVersion: staff.accessVersion }
              : {}),
            expiresAt: now + 5 * 60 * 1000,
            attempts: 0,
          });
          try {
            await emailTransport.send(
              {
                from: emailTransport.from,
                to: [mfaEmail],
                subject:
                  "Admin sign-in verification · Machhapuchhree Electronics",
                text: `Your admin sign-in code is ${code}. It expires in five minutes. Do not share this code. If you did not try to sign in, change your admin password immediately.`,
              },
              `admin-login-${challengeId}`,
            );
          } catch {
            adminChallenges.delete(challengeId);
            throw new HttpError(
              503,
              "We could not send the admin verification code.",
            );
          }
          return json(response, 200, {
            mfaRequired: true,
            challengeId,
            expiresAt: now + 5 * 60 * 1000,
          });
        }
        return json(response, 200, {
          user: issueAdminSession(request, response, {
            username: accountUsername,
            role,
            staff,
          }),
        });
      }
      if (route === "/api/admin/login/verify" && method === "POST") {
        const input = await body(request);
        const challengeId = text(
          input?.challengeId,
          "Verification request",
          48,
          48,
        );
        const code = text(input?.code, "Verification code", 6, 6);
        const challenge = adminChallenges.get(challengeId);
        if (!challenge || challenge.expiresAt <= adminNow()) {
          adminChallenges.delete(challengeId);
          throw new HttpError(
            401,
            "Admin verification code expired. Sign in again.",
          );
        }
        challenge.attempts++;
        if (
          !equal(
            challenge.codeHash,
            createHash("sha256").update(`${challengeId}:${code}`).digest("hex"),
          )
        ) {
          if (challenge.attempts >= 5) adminChallenges.delete(challengeId);
          else adminChallenges.set(challengeId, challenge);
          throw new HttpError(
            401,
            challenge.attempts >= 5
              ? "Too many incorrect codes. Sign in again."
              : "That verification code is incorrect.",
          );
        }
        adminChallenges.delete(challengeId);
        const staff =
          challenge.role === "staff"
            ? (store.read().staffAccounts || []).find(
                (account) => account.id === challenge.staffId,
              )
            : null;
        const credentialStillValid =
          challenge.role === "owner"
            ? configured &&
              challenge.username === username &&
              challenge.credentialHash === passwordHash
            : staff?.enabled &&
              staff.username === challenge.username &&
              staff.passwordHash === challenge.credentialHash &&
              staff.accessVersion === challenge.accessVersion;
        if (!credentialStillValid)
          throw new HttpError(401, "Admin access changed. Sign in again.");
        return json(response, 200, {
          user: issueAdminSession(request, response, {
            username: challenge.username,
            role: challenge.role,
            staff,
          }),
        });
      }
      if (route === "/api/admin/logout" && method === "POST") {
        const current = session(request);
        if (current) sessions.delete(sessionKey(current.token));
        setCookie(response, "", 0, request);
        return json(response, 200, { ok: true });
      }
      if (route.startsWith("/api/admin/") && !session(request))
        throw new HttpError(401, "Please sign in to the admin area.");
      const requiredStaffPermission = staffPermissionForRoute(route);
      const activeAdmin = session(request);
      if (
        route.startsWith("/api/admin/") &&
        activeAdmin?.role === "staff" &&
        (!requiredStaffPermission ||
          !activeAdmin.permissions?.[requiredStaffPermission])
      )
        throw new HttpError(403, "Your staff role does not allow this area.");
      if (
        activeAdmin &&
        requiresRecentAdminAuth(route, method) &&
        (!Number.isFinite(activeAdmin.authAt) ||
          adminNow() - activeAdmin.authAt > 10 * 60 * 1000)
      )
        throw new HttpError(
          403,
          "Please sign in again before making this security-sensitive change.",
        );
      if (route === "/api/admin/phone-catalogue" && method === "GET") {
        const overrides = await readCatalogueOverrides(store);
        const phones = await effectiveCatalogue(store, adminPhoneCatalogue());
        return json(response, 200, {
          phones: phones.map((phone) => {
            const gallery = catalogueImageForProduct({
              category: "new",
              brand: phone.brand,
              name: phone.model,
            });
            const images =
              overrides[phone.deviceId]?.images || gallery?.images || [];
            const variants = phones
              .filter((item) => item.deviceId === phone.deviceId)
              .map((item) => ({ ram: item.ram, storage: item.storage }));
            return {
              ...phone,
              variants,
              hasOverride: !!overrides[phone.deviceId],
              catalogueImage: images[0]?.url || "",
              catalogueImages: images,
              catalogueImageCount: images.length,
            };
          }),
        });
      }
      const catalogueOverrideRoute = route.match(
        /^\/api\/admin\/phone-catalogue\/([^/]+)(?:\/reset(?:-field)?)?$/,
      );
      if (catalogueOverrideRoute && ["PATCH", "POST"].includes(method)) {
        const deviceId = decodeURIComponent(catalogueOverrideRoute[1]);
        if (!adminPhoneCatalogue().some((phone) => phone.deviceId === deviceId))
          throw new HttpError(404, "Catalogue device not found.");
        const isReset = route.includes("/reset");
        const input = await body(request);
        if (isReset) await resetCatalogueOverride(store, deviceId, input.field);
        else
          await saveCatalogueOverride(
            store,
            deviceId,
            input,
            session(request)?.username,
          );
        return json(response, 200, { ok: true });
      }
      const catalogueImageRoute = route.match(
        /^\/api\/admin\/phone-catalogue\/([^/]+)\/images(?:\/(\d+))?$/,
      );
      if (catalogueImageRoute && ["POST", "PATCH", "DELETE"].includes(method)) {
        const deviceId = decodeURIComponent(catalogueImageRoute[1]);
        if (!adminPhoneCatalogue().some((phone) => phone.deviceId === deviceId))
          throw new HttpError(404, "Catalogue device not found.");
        const overrides = await readCatalogueOverrides(store);
        const current = overrides[deviceId]?.images || [];
        if (method === "POST") {
          const requestedPosition = catalogueImageRoute[2]
            ? Number(catalogueImageRoute[2])
            : undefined;
          if (
            requestedPosition &&
            (requestedPosition < 1 || requestedPosition > 3)
          )
            throw new HttpError(400, "Image position is invalid.");
          if (!requestedPosition && current.length >= 3)
            throw new HttpError(
              400,
              "A catalogue device can have at most three images.",
            );
          const { data } = await readImageUpload(request, 5);
          const position = requestedPosition || current.length + 1;
          const uploaded = await uploadPhoneCatalogueBuffer(
            deviceId,
            data,
            position,
            Boolean(requestedPosition),
          );
          const replacement = {
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            position,
            sourceUrl: "",
            license: "Admin-uploaded catalogue asset",
            attributionRequired: false,
            sourceRightsStatus: "admin_upload",
          };
          const images = [
            ...current.filter((image) => image.position !== position),
            replacement,
          ].sort((a, b) => a.position - b.position);
          await saveCatalogueOverride(
            store,
            deviceId,
            { images },
            session(request)?.username,
          );
          return json(response, 201, { images });
        }
        const position = Number(catalogueImageRoute[2]);
        if (!Number.isInteger(position) || position < 1 || position > 3)
          throw new HttpError(400, "Image position is invalid.");
        if (method === "DELETE") {
          const images = current
            .filter((image) => image.position !== position)
            .map((image, index) => ({ ...image, position: index + 1 }));
          await saveCatalogueOverride(
            store,
            deviceId,
            { images },
            session(request)?.username,
          );
          return json(response, 200, { images });
        }
        const input = await body(request);
        const images = current.filter((image) => image.position !== position);
        const target = current.find((image) => image.position === position);
        if (!target) throw new HttpError(404, "Catalogue image not found.");
        const ordered = [target, ...images].map((image, index) => ({
          ...image,
          position: index + 1,
        }));
        await saveCatalogueOverride(
          store,
          deviceId,
          { images: ordered },
          session(request)?.username,
        );
        return json(response, 200, { images: ordered });
      }
      if (
        route === "/api/admin/staff" ||
        route.startsWith("/api/admin/staff/")
      ) {
        if (session(request)?.role !== "owner")
          throw new HttpError(
            403,
            "Only the main admin can manage staff logins.",
          );
        if (route === "/api/admin/staff" && method === "GET")
          return json(response, 200, {
            staff: (store.read().staffAccounts || []).map(publicStaff),
          });
        if (route === "/api/admin/staff" && method === "POST")
          return json(response, 201, {
            account: saveStaff(store, username, await body(request)),
          });
        const accountRoute = route.match(/^\/api\/admin\/staff\/([^/]+)$/);
        if (accountRoute && method === "PATCH")
          return json(response, 200, {
            account: saveStaff(
              store,
              username,
              await body(request),
              accountRoute[1],
            ),
          });
        throw new HttpError(404, "API route not found.");
      }
      if (route === "/api/admin/images" && method === "POST")
        return json(
          response,
          201,
          await saveProductImage(
            request,
            imageDirectory,
            store.saveImage ? store : undefined,
          ),
        );
      if (route === "/api/admin/payment-config" && method === "GET")
        return json(response, 200, {
          config: store.read().paymentConfig || {
            qrImage: "",
            instructions: "",
            accountName: "",
          },
        });
      if (route === "/api/admin/payment-config" && method === "PATCH") {
        if (
          session(request)?.role !== "owner" &&
          !session(request)?.permissions?.paymentQr
        )
          throw new HttpError(
            403,
            "You do not have permission to manage payment QR settings.",
          );
        const input = await body(request);
        const config = {
          qrImage:
            typeof input.qrImage === "string"
              ? input.qrImage.slice(0, 1000)
              : store.read().paymentConfig?.qrImage || "",
          instructions:
            typeof input.instructions === "string"
              ? input.instructions.trim().slice(0, 1000)
              : store.read().paymentConfig?.instructions || "",
          accountName:
            typeof input.accountName === "string"
              ? input.accountName.trim().slice(0, 160)
              : store.read().paymentConfig?.accountName || "",
        };
        store.commit({ ...store.read(), paymentConfig: config });
        return json(response, 200, { config });
      }
      if (route === "/api/admin/payment-config/image" && method === "POST") {
        if (
          session(request)?.role !== "owner" &&
          !session(request)?.permissions?.paymentQr
        )
          throw new HttpError(
            403,
            "You do not have permission to manage payment QR settings.",
          );
        const uploaded = await saveProductImage(
          request,
          imageDirectory,
          store.saveImage ? store : undefined,
        );
        const config = {
          ...(store.read().paymentConfig || {}),
          qrImage: uploaded.image,
        };
        store.commit({ ...store.read(), paymentConfig: config });
        return json(response, 201, { config });
      }
      const emailRetry = route.match(/^\/api\/admin\/emails\/([^/]+)\/retry$/);
      if (emailRetry && method === "POST") {
        if (!emailWorker.configured)
          throw new HttpError(503, "Configure the email service first.");
        const current = store.read();
        const job = current.emailQueue.find(
          (email) => email.id === emailRetry[1],
        );
        if (!job) throw new HttpError(404, "Email notification not found.");
        if (job.state !== "failed")
          throw new HttpError(409, "Only a failed email can be retried.");
        if (
          job.firstAttemptAt &&
          Date.now() - job.firstAttemptAt >= 23 * 60 * 60 * 1000
        )
          throw new HttpError(
            409,
            "Review delivery in your email service before resending. The duplicate-prevention window has elapsed.",
          );
        store.commit({
          ...current,
          emailQueue: current.emailQueue.map((email) =>
            email.id === job.id
              ? {
                  ...email,
                  state: "queued",
                  attempts: 0,
                  nextAttemptAt: 0,
                  sendInProgress: false,
                  leaseUntil: 0,
                  error: null,
                }
              : email,
          ),
        });
        sendQueuedEmails();
        return json(response, 200, { ok: true });
      }
      const imageRoute = route.match(
        /^\/api\/images\/(upload-[a-f0-9-]{36}\.(png|jpg|webp))$/,
      );
      if (imageRoute && ["GET", "HEAD"].includes(method)) {
        if (store.readImage) {
          const image = await store.readImage(imageRoute[1]);
          if (!image) throw new HttpError(404, "Photo not found.");
          response.writeHead(200, {
            "Content-Type": image.content_type,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=31536000, immutable",
          });
          return response.end(method === "HEAD" ? undefined : image.data);
        }
        const file = path.join(imageDirectory, imageRoute[1]);
        if (!existsSync(file)) throw new HttpError(404, "Photo not found.");
        response.writeHead(200, {
          "Content-Type": {
            png: "image/png",
            jpg: "image/jpeg",
            webp: "image/webp",
          }[imageRoute[2]],
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        return response.end(method === "HEAD" ? undefined : readFileSync(file));
      }
      if (route === "/api/admin/orders" && method === "GET")
        return json(response, 200, {
          emailConfigured: emailWorker.configured,
          smsMode: customerAuth.mode(request),
          orders: store
            .read()
            .orders.map((order) => ({
              ...adminOrder(order),
              emailNotifications: emailSummary(order, store.read().emailQueue),
            }))
            .sort((a, b) => b.date.localeCompare(a.date)),
        });
      const paymentReview = route.match(
        /^\/api\/admin\/orders\/([^/]+)\/payment$/,
      );
      if (paymentReview && method === "PATCH") {
        if (session(request)?.role !== "owner")
          throw new HttpError(403, "Only the main admin can verify payments.");
        const input = await body(request);
        if (!["PAID", "REJECTED"].includes(input.status))
          throw new HttpError(400, "Select verify or reject.");
        const current = store.read();
        const order = current.orders.find(
          (item) => item.id === paymentReview[1],
        );
        if (!order) throw new HttpError(404, "Order not found.");
        if (paymentProvider(order.payment) !== "MANUAL_QR")
          throw new HttpError(
            409,
            "Only manual QR payments can be verified by an admin.",
          );
        if (["Cancelled", "Completed", "Delivered"].includes(order.status))
          throw new HttpError(409, "This order is closed.");
        if (
          !["VERIFICATION_PENDING", "PENDING_VERIFICATION"].includes(
            order.payment?.status,
          ) ||
          !order.payment?.reference
        )
          throw new HttpError(
            409,
            "Wait for a customer payment reference before reviewing payment.",
          );
        const payment = updatePayment(order.payment || {}, {
          status: input.status,
          verificationType: "ADMIN",
          verifiedAt: new Date().toISOString(),
          verifiedBy: session(request).username,
          reviewedAt: new Date().toISOString(),
          reviewedBy: session(request).username,
        });
        const updated = { ...order, payment };
        store.commit({
          ...current,
          orders: current.orders.map((item) =>
            item.id === order.id ? updated : item,
          ),
        });
        return json(response, 200, { order: adminOrder(updated) });
      }
      if (route === "/api/admin/bills" && method === "GET")
        return json(response, 200, {
          bills: store.read().bills.slice().reverse(),
        });
      if (route === "/api/admin/sales" && method === "GET") {
        const current = store.read();
        const website = current.orders
          .filter((order) => ["Completed", "Delivered"].includes(order.status))
          .map((order) => ({
            id: `ORDER-${order.id}`,
            date: order.handover?.date || order.date,
            source:
              order.fulfillment === "DELIVERY"
                ? "WEBSITE_DELIVERY"
                : "WEBSITE_PICKUP",
            total: order.total,
            paymentMethod: order.payment?.method || "PAY_AT_SHOP",
            customerName: order.name,
            orderId: order.id,
            items: order.items.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              quantity: item.quantity,
              price: item.product.price,
            })),
          }));
        return json(response, 200, {
          sales: [...website, ...current.sales].sort((a, b) =>
            b.date.localeCompare(a.date),
          ),
        });
      }
      if (route === "/api/admin/sales" && method === "POST") {
        const input = await body(request);
        const current = store.read();
        if (!Array.isArray(input.items) || !input.items.length)
          throw new HttpError(400, "Add at least one product.");
        const items = input.items.map((line) => {
          const product = current.products.find(
            (item) => item.id === line.productId,
          );
          if (
            !product ||
            product.stockQuantity === null ||
            product.stockQuantity < line.quantity
          )
            throw new HttpError(409, "Insufficient stock.");
          if (
            !Number.isInteger(line.quantity) ||
            line.quantity < 1 ||
            line.quantity > 100
          )
            throw new HttpError(400, "Invalid quantity.");
          return {
            productId: product.id,
            name: product.name,
            quantity: line.quantity,
            price: product.price,
          };
        });
        const total = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        const sale = {
          id: `SALE-${Date.now().toString(36).toUpperCase()}`,
          date: new Date().toISOString(),
          source: "WALK_IN",
          paymentMethod: ["CASH", "QR_ESEWA", "OTHER"].includes(
            input.paymentMethod,
          )
            ? input.paymentMethod
            : "CASH",
          total,
          customerName:
            typeof input.customerName === "string"
              ? input.customerName.trim().slice(0, 100)
              : "",
          note:
            typeof input.note === "string"
              ? input.note.trim().slice(0, 500)
              : "",
          staff: session(request).username,
          items,
        };
        store.commit({
          ...current,
          sales: [...current.sales, sale],
          products: current.products.map((product) => {
            const line = items.find((item) => item.productId === product.id);
            if (!line) return product;
            const stockQuantity = product.stockQuantity - line.quantity;
            return {
              ...product,
              stockQuantity,
              stockVersion: product.stockVersion + 1,
              available: stockQuantity > 0,
            };
          }),
        });
        return json(response, 201, { sale });
      }
      if (route === "/api/admin/bills" && method === "POST") {
        const bill = issueBill(store, await body(request), session(request));
        return json(response, 201, { bill });
      }
      const adminBillPdf = route.match(/^\/api\/admin\/bills\/([^/]+)\/pdf$/);
      if (adminBillPdf && method === "GET") {
        const bill = store
          .read()
          .bills.find((item) => item.id === adminBillPdf[1]);
        if (!bill) throw new HttpError(404, "Bill not found.");
        return sendBill(response, bill);
      }
      if (route === "/api/admin/repairs" && method === "GET")
        return json(response, 200, {
          tickets: store.read().repairTickets.slice().reverse(),
        });
      if (route === "/api/admin/repairs" && method === "POST") {
        const input = await body(request);
        const current = store.read();
        const ticket = {
          id: `ME-R${String(current.repairTickets.length + 1).padStart(6, "0")}`,
          token: randomBytes(16).toString("hex"),
          claimCode: String(randomInt(100000, 1000000)),
          customerName: text(input.customerName, "Customer name", 2, 100),
          phone: normalizePhone(input.phone),
          device: text(input.device, "Device", 2, 120),
          problem: text(input.problem, "Problem", 2, 1000),
          status: "Device Received",
          deviceType: input.deviceType === "meter" ? "meter" : "mobile",
          brand:
            typeof input.brand === "string"
              ? input.brand.trim().slice(0, 60)
              : "",
          model:
            typeof input.model === "string"
              ? input.model.trim().slice(0, 120)
              : "",
          issueCategory:
            typeof input.issueCategory === "string"
              ? input.issueCategory.trim().slice(0, 40)
              : "other",
          approval: "NOT_REQUIRED",
          diagnosis: "",
          estimatedCost: null,
          finalCost: null,
          customerUpdate: "",
          internalNotes: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [
            {
              status: "Received",
              date: new Date().toISOString(),
              by: session(request).username,
            },
          ],
        };
        store.commit({
          ...current,
          repairTickets: [...current.repairTickets, ticket],
        });
        return json(response, 201, { ticket });
      }
      const repairCode = route.match(/^\/api\/admin\/repairs\/([^/]+)\/code$/);
      if (repairCode && method === "POST") {
        const current = store.read();
        const ticket = current.repairTickets.find(
          (item) => item.id === repairCode[1],
        );
        if (!ticket) throw new HttpError(404, "Repair ticket not found.");
        if (ticket.customerId)
          throw new HttpError(409, "Repair is already linked to an account.");
        const updated = {
          ...ticket,
          claimCode: String(randomInt(100000, 1000000)),
        };
        store.commit({
          ...current,
          repairTickets: current.repairTickets.map((item) =>
            item.id === ticket.id ? updated : item,
          ),
        });
        return json(response, 200, { ticket: updated });
      }
      const repairUpdate = route.match(/^\/api\/admin\/repairs\/([^/]+)$/);
      if (repairUpdate && method === "PATCH") {
        const input = await body(request);
        const current = store.read();
        const ticket = current.repairTickets.find(
          (item) => item.id === repairUpdate[1],
        );
        if (!ticket) throw new HttpError(404, "Repair ticket not found.");
        if (input.status && !repairStatuses.includes(input.status))
          throw new HttpError(400, "Select a valid repair status.");
        if (input.status && !canRepairTransition(ticket.status, input.status))
          throw new HttpError(
            409,
            "That repair status transition is not allowed.",
          );
        if (
          input.approval &&
          !["NOT_REQUIRED", "PENDING", "APPROVED", "DECLINED"].includes(
            input.approval,
          )
        )
          throw new HttpError(400, "Approval state is invalid.");
        const estimatedCost =
          input.estimatedCost === undefined
            ? ticket.estimatedCost
            : input.estimatedCost;
        const finalCost =
          input.finalCost === undefined ? ticket.finalCost : input.finalCost;
        if (
          estimatedCost !== null &&
          (!Number.isSafeInteger(estimatedCost) ||
            estimatedCost < 0 ||
            estimatedCost > 100000000)
        )
          throw new HttpError(400, "Estimated cost is invalid.");
        if (
          finalCost !== null &&
          (!Number.isSafeInteger(finalCost) ||
            finalCost < 0 ||
            finalCost > 100000000)
        )
          throw new HttpError(400, "Final cost is invalid.");
        if (
          !input.status &&
          input.diagnosis === undefined &&
          input.customerUpdate === undefined &&
          input.estimatedCost === undefined &&
          input.finalCost === undefined &&
          input.approval === undefined
        )
          return json(response, 200, { ticket });
        const date = new Date().toISOString();
        const nextStatus = input.status || ticket.status;
        const message =
          input.customerUpdate === undefined
            ? ""
            : text(input.customerUpdate, "Customer update", 1, 500);
        const updated = {
          ...ticket,
          status: nextStatus,
          diagnosis:
            input.diagnosis === undefined
              ? ticket.diagnosis || ""
              : text(input.diagnosis, "Diagnosis", 1, 1000),
          customerUpdate:
            input.customerUpdate === undefined
              ? ticket.customerUpdate || ""
              : message,
          internalNotes:
            input.internalNotes === undefined
              ? ticket.internalNotes || ""
              : text(input.internalNotes, "Internal staff notes", 0, 2000),
          estimatedCost,
          finalCost,
          approval: input.approval || ticket.approval || "NOT_REQUIRED",
          updatedAt: date,
          history:
            nextStatus !== ticket.status
              ? [
                  ...(ticket.history || []),
                  {
                    status: nextStatus,
                    date,
                    by: session(request).username,
                    ...(message ? { message } : {}),
                  },
                ]
              : ticket.history,
        };
        store.commit({
          ...current,
          repairTickets: current.repairTickets.map((item) =>
            item.id === ticket.id ? updated : item,
          ),
        });
        return json(response, 200, { ticket: updated });
      }
      if (route === "/api/admin/catalogue/preview" && method === "POST")
        return json(
          response,
          200,
          previewInventory(await body(request), store.read()),
        );
      if (route === "/api/admin/catalogue/replace-samples" && method === "POST")
        return json(
          response,
          200,
          await replaceSamples(await body(request), store, dataFile),
        );
      const orderStatus = route.match(/^\/api\/admin\/orders\/([^/]+)$/);
      if (orderStatus && method === "PATCH") {
        const input = await body(request);
        if (!statuses.includes(input?.status))
          throw new HttpError(400, "Select a valid order status.");
        const current = store.read();
        const order = current.orders.find((o) => o.id === orderStatus[1]);
        if (!order) throw new HttpError(404, "Order not found.");
        if (
          ["MANUAL_QR", "ESEWA"].includes(paymentProvider(order.payment)) &&
          order.payment.status !== "PAID" &&
          input.status !== "Cancelled"
        )
          throw new HttpError(
            409,
            "Verify the QR payment before advancing this order.",
          );
        if (order.status === input.status)
          return json(response, 200, {
            order: {
              ...adminOrder(order),
              emailNotifications: emailSummary(order, current.emailQueue),
            },
          });
        if (["Cancelled", "Completed", "Delivered"].includes(order.status))
          throw new HttpError(
            409,
            "This order is closed. Cancelled and completed orders cannot be changed.",
          );
        if (input.status === "Completed" && order.status !== "Ready for pickup")
          throw new HttpError(409, "Mark the order ready before pickup.");
        if (
          order.fulfillment === "DELIVERY" &&
          ["Ready for pickup", "Completed"].includes(input.status)
        )
          throw new HttpError(
            409,
            "Use delivery statuses for a delivery order.",
          );
        if (
          order.fulfillment !== "DELIVERY" &&
          ["Preparing", "Out for delivery", "Delivered"].includes(input.status)
        )
          throw new HttpError(409, "Use pickup statuses for a pickup order.");
        if (input.status === "Preparing" && order.status !== "Confirmed")
          throw new HttpError(
            409,
            "Confirm the order before preparing delivery.",
          );
        if (
          input.status === "Out for delivery" &&
          !["Preparing", "Ready for pickup"].includes(order.status)
        )
          throw new HttpError(
            409,
            "Prepare the order before dispatching delivery.",
          );
        if (input.status === "Delivered" && order.status !== "Out for delivery")
          throw new HttpError(409, "Mark the order out for delivery first.");
        const releaseStock =
          input.status === "Cancelled" && order.stockReserved === true;
        const products = releaseStock
          ? current.products.map((product) => {
              const item = order.items.find(
                (item) => item.product.id === product.id,
              );
              if (!item || product.stockQuantity === null) return product;
              return {
                ...product,
                stockQuantity: product.stockQuantity + item.quantity,
                stockVersion: product.stockVersion + 1,
                available: true,
              };
            })
          : current.products;
        const updated = {
          ...order,
          status: input.status,
          ...(["Completed", "Delivered"].includes(input.status)
            ? {
                handover: {
                  date: new Date().toISOString(),
                  by: session(request).username,
                },
              }
            : {}),
          ...(releaseStock ? { stockReserved: false } : {}),
          history: [
            ...(order.history || [{ status: order.status, date: order.date }]),
            { status: input.status, date: new Date().toISOString() },
          ],
        };
        store.commit({
          ...current,
          products,
          orders: current.orders.map((o) => (o.id === order.id ? updated : o)),
          emailQueue: current.emailQueue,
        });
        let bill;
        if (["Completed", "Delivered"].includes(input.status)) {
          bill = issueBill(store, { orderId: order.id }, session(request));
        }
        const email = createOrderEmail(updated);
        if (email && bill) {
          const pdf = await billPdf(bill);
          email.message.attachments = [
            {
              filename: `${bill.id}.pdf`,
              content: pdf.toString("base64"),
              content_type: "application/pdf",
            },
          ];
        }
        if (email) {
          const latest = store.read();
          store.commit({
            ...latest,
            emailQueue: [...latest.emailQueue, email],
          });
        }
        sendQueuedEmails();
        return json(response, 200, {
          order: {
            ...adminOrder(updated),
            emailNotifications: emailSummary(updated, store.read().emailQueue),
          },
        });
      }
      if (route === "/api/admin/products" && method === "POST") {
        const product = validateCatalogueGrouping(
          validateProduct(await body(request)),
        );
        product.id = randomUUID();
        product.reviewedAt = new Date().toISOString();
        if (
          product.inspection &&
          (Object.values(product.inspection.checks).some(
            (value) => value !== "not_checked",
          ) ||
            product.inspection.defects ||
            product.inspection.included)
        )
          product.inspection.inspectedAt = new Date().toISOString();
        product.slug =
          `${product.brand}-${product.name}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "product";
        if (store.read().products.some((p) => p.slug === product.slug))
          product.slug += "-" + product.id.slice(0, 8);
        const current = store.read();
        store.commit({ ...current, products: [product, ...current.products] });
        return json(response, 201, { product });
      }
      const stockRoute = route.match(
        /^\/api\/admin\/products\/([^/]+)\/stock$/,
      );
      const reviewRoute = route.match(
        /^\/api\/admin\/products\/([^/]+)\/review$/,
      );
      if (reviewRoute && method === "POST") {
        const current = store.read();
        const product = current.products.find((p) => p.id === reviewRoute[1]);
        if (!product) throw new HttpError(404, "Product not found.");
        const updated = { ...product, reviewedAt: new Date().toISOString() };
        store.commit({
          ...current,
          products: current.products.map((p) =>
            p.id === product.id ? updated : p,
          ),
        });
        return json(response, 200, { product: updated });
      }
      if (stockRoute && method === "PATCH") {
        const input = await body(request);
        const current = store.read();
        const product = current.products.find((p) => p.id === stockRoute[1]);
        if (!product) throw new HttpError(404, "Product not found.");
        if (input.stockVersion !== product.stockVersion)
          throw new HttpError(
            409,
            "Stock changed. Refresh the catalogue before updating quantity.",
          );
        if (
          !Number.isSafeInteger(input.stockQuantity) ||
          input.stockQuantity < 0 ||
          input.stockQuantity > 1000000
        )
          throw new HttpError(400, "Enter a valid stock quantity.");
        const updated = {
          ...product,
          stockQuantity: input.stockQuantity,
          stockVersion: product.stockVersion + 1,
          available: input.stockQuantity > 0,
          reviewedAt: new Date().toISOString(),
        };
        store.commit({
          ...current,
          products: current.products.map((p) =>
            p.id === product.id ? updated : p,
          ),
        });
        return json(response, 200, { product: updated });
      }
      const productRoute = route.match(/^\/api\/admin\/products\/([^/]+)$/);
      if (productRoute && ["PATCH", "DELETE"].includes(method)) {
        const input = method === "PATCH" ? await body(request) : null;
        const current = store.read();
        const product = current.products.find((p) => p.id === productRoute[1]);
        if (!product) throw new HttpError(404, "Product not found.");
        if (method === "DELETE") {
          store.commit({
            ...current,
            products: current.products.filter((p) => p.id !== product.id),
          });
          return json(response, 200, { ok: true });
        }
        const updated = validateCatalogueGrouping(
          validateProduct(input, product),
        );
        if (
          updated.price !== product.price ||
          updated.stockQuantity !== product.stockQuantity
        )
          updated.reviewedAt = new Date().toISOString();
        if (
          updated.inspection &&
          JSON.stringify(updated.inspection) !==
            JSON.stringify(product.inspection)
        )
          updated.inspection.inspectedAt = new Date().toISOString();
        store.commit({
          ...current,
          products: current.products.map((p) =>
            p.id === product.id ? updated : p,
          ),
        });
        return json(response, 200, { product: updated });
      }
      if (route === "/api/orders" && method === "POST") {
        const input = await body(request);
        const account = customerAuth.session(request)?.customer;
        if (input.accountOrder === true && !account)
          throw new HttpError(
            401,
            "Your login has expired. Please log in again before placing the order.",
          );
        if (account && !profileComplete(account))
          throw new HttpError(
            400,
            "Complete your name and email in your profile before ordering.",
          );
        const customer = validateCustomer(
          account
            ? {
                ...input,
                name: account.name,
                phone: account.phone,
                email: account.email,
              }
            : input,
        );
        const fingerprint = createHash("sha256")
          .update(
            JSON.stringify({ ...customer, customerId: account?.id || null }),
          )
          .digest("hex");
        const current = store.read();
        const duplicate = current.orders.find(
          (o) => o.requestId === customer.requestId,
        );
        if (duplicate) {
          if (duplicate.fingerprint !== fingerprint)
            throw new HttpError(
              409,
              "Order details changed. Return to your bag and try again.",
            );
          return json(response, 200, { order: publicOrder(duplicate) });
        }
        const items = customer.items.map((item) => {
          const product = current.products.find((p) => p.id === item.productId);
          if (!product?.available)
            throw new HttpError(
              409,
              "A product is no longer available. Refresh your bag.",
            );
          if (item.quantity > product.stockQuantity)
            throw new HttpError(
              409,
              `Only ${product.stockQuantity} of ${product.name} are available. Review your bag quantity.`,
            );
          return { product, quantity: item.quantity };
        });
        const subtotal = items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0,
        );
        const deliveryFee = customer.fulfillmentMethod === "DELIVERY" ? 175 : 0;
        const total = subtotal + deliveryFee;
        if (
          typeof input.expectedTotal !== "number" ||
          input.expectedTotal !== total
        )
          throw new HttpError(
            409,
            "Prices have changed. Review the updated bag total before ordering.",
          );
        limitOrderEmails(request, customer.email);
        const order = {
          id: `ME-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`,
          name: customer.name,
          email: customer.email,
          ...(account ? { customerId: account.id } : {}),
          phone: customer.phone,
          language: customer.language,
          note: customer.note,
          items,
          total,
          date: new Date().toISOString(),
          status: statuses[0],
          history: [{ status: statuses[0], date: new Date().toISOString() }],
          fulfillment:
            customer.fulfillmentMethod === "DELIVERY" ? "DELIVERY" : "PICKUP",
          deliveryFee,
          deliveryAddress: customer.deliveryAddress,
          payment: createPayment({
            orderId: `pending`,
            method: customer.paymentMethod,
            amount: total,
          }),
          receiptToken: randomBytes(32).toString("hex"),
          requestId: customer.requestId,
          fingerprint,
          stockReserved: true,
        };
        order.payment.orderId = order.id;
        store.commit({
          ...current,
          products: current.products.map((product) => {
            const item = items.find((item) => item.product.id === product.id);
            if (!item) return product;
            const stockQuantity = product.stockQuantity - item.quantity;
            return {
              ...product,
              stockQuantity,
              stockVersion: product.stockVersion + 1,
              available: stockQuantity > 0,
            };
          }),
          orders: [...current.orders, order],
          emailQueue: [
            ...current.emailQueue,
            createOrderEmail(order, "received"),
          ],
        });
        sendQueuedEmails();
        return json(response, 201, { order: publicOrder(order) });
      }
      const paymentSubmit = route.match(/^\/api\/orders\/([^/]+)\/payment$/);
      if (paymentSubmit && method === "PATCH") {
        const input = await body(request);
        const current = store.read();
        const order = current.orders.find(
          (item) => item.id === paymentSubmit[1],
        );
        if (
          !order ||
          (order.customerId
            ? customerAuth.session(request)?.customer.id !== order.customerId
            : !equal(
                request.headers["x-order-token"] || "",
                order.receiptToken,
              ))
        )
          throw new HttpError(404, "Order not found.");
        if (paymentProvider(order.payment) !== "MANUAL_QR")
          throw new HttpError(
            400,
            "This order does not use manual QR payment.",
          );
        if (["Cancelled", "Completed", "Delivered"].includes(order.status))
          throw new HttpError(409, "This order is closed.");
        if (order.payment?.status === "PAID")
          throw new HttpError(409, "Payment has already been verified.");
        const reference = text(
          input.reference,
          "Transaction/reference ID",
          3,
          120,
        );
        const payment = updatePayment(order.payment, {
          reference,
          customerReference: reference,
          status: "VERIFICATION_PENDING",
          verificationType: undefined,
          verifiedAt: undefined,
          verifiedBy: undefined,
          reviewedAt: undefined,
          reviewedBy: undefined,
          submittedAt: new Date().toISOString(),
        });
        const updated = { ...order, payment };
        store.commit({
          ...current,
          orders: current.orders.map((item) =>
            item.id === order.id ? updated : item,
          ),
        });
        return json(response, 200, {
          order: publicOrder(updated),
          message: "Payment submitted. We will verify your payment shortly.",
        });
      }
      const receiptRoute = route.match(/^\/api\/orders\/([^/]+)$/);
      if (receiptRoute && method === "GET") {
        const order = store.read().orders.find((o) => o.id === receiptRoute[1]);
        if (
          !order ||
          (order.customerId
            ? customerAuth.session(request)?.customer.id !== order.customerId
            : !equal(
                request.headers["x-order-token"] || "",
                order.receiptToken,
              ))
        )
          throw new HttpError(404, "Order not found.");
        return json(response, 200, {
          order: {
            ...publicOrder(order),
            billIssued: store
              .read()
              .bills.some((bill) => bill.orderId === order.id),
          },
        });
      }
      if (route.startsWith("/api"))
        throw new HttpError(404, "API route not found.");
      if (method !== "GET" && method !== "HEAD")
        throw new HttpError(405, "Method not allowed.");
      const dist =
        options.staticDir || path.join(backendRoot, "../frontend/dist");
      const requested = path.resolve(dist, "." + decodeURIComponent(route));
      if (
        !requested.startsWith(path.resolve(dist) + path.sep) &&
        requested !== path.resolve(dist)
      )
        throw new HttpError(404, "File not found.");
      let file = requested;
      if (!existsSync(file) || !statSync(file).isFile()) {
        if (path.extname(route)) throw new HttpError(404, "File not found.");
        file = path.join(dist, "index.html");
      }
      if (!existsSync(file))
        return json(response, 404, {
          error:
            "Start the frontend with npm run dev, or build it with npm run build.",
        });
      const mime = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".txt": "text/plain",
        ".xml": "application/xml",
      };
      response.writeHead(200, {
        "Content-Type":
          (mime[path.extname(file)] || "application/octet-stream") +
          "; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
        "Cache-Control": "no-cache",
      });
      response.end(method === "HEAD" ? undefined : readFileSync(file));
    } catch (error) {
      if (!response.headersSent)
        json(response, error instanceof HttpError ? error.status : 500, {
          error:
            error instanceof HttpError
              ? error.message
              : "Something went wrong. Please try again.",
        });
      if (!(error instanceof HttpError)) console.error("Request failed.");
    }
  }
  async function handle(request, response) {
    if (!store.transaction) return handleRequest(request, response);
    const buffered = bufferedResponse(response);
    try {
      await store.transaction(() => handleRequest(request, buffered));
      buffered.flush();
    } catch {
      console.error("Database request could not be committed.");
      if (!response.headersSent)
        json(response, 503, {
          error: "The shop is temporarily unavailable. Please try again.",
        });
    }
  }
  const server = http.createServer(handle);
  server.handle = handle;
  server.drainEmails = (options) => emailWorker.drain(options);
  server.requestTimeout = 15000;
  server.on("listening", sendQueuedEmails);
  server.on("close", () => emailWorker.stop());
  return server;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || "127.0.0.1";
  const app = createApp();
  app.listen(port, host, () =>
    console.log(`Backend ready at http://${host}:${port}`),
  );
  app.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  process.on("SIGINT", () => app.close(() => process.exit(0)));
  process.on("SIGTERM", () => app.close(() => process.exit(0)));
}
