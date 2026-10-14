import http from "node:http";
import {
  randomBytes,
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
import { saveProductImage } from "./images.mjs";
import { publicStaff, saveStaff } from "./staff.mjs";
import { previewInventory, replaceSamples } from "./catalogue.mjs";
import { publicReferencePhones } from "./phone-reference.mjs";
import { issueBill, billPdf } from "./billing.mjs";
import {
  createCustomerAuth,
  publicCustomer,
  profileComplete,
} from "./customer-auth.mjs";
import {
  createOrderEmail,
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
const backendRoot = path.dirname(fileURLToPath(import.meta.url));
if (existsSync(path.join(backendRoot, ".env")))
  loadEnvFile(path.join(backendRoot, ".env"));
const sessionDuration = 8 * 60 * 60 * 1000;
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
  const { requestId, fingerprint, customerId, stockReserved, handover, ...receipt } =
    order;
  if (customerId) delete receipt.receiptToken;
  return { ...receipt, ...(handover ? { handover: { date: handover.date } } : {}), accountOrder: !!customerId };
}
function adminOrder(order) {
  const { receiptToken, ...receipt } = publicOrder(order);
  return { ...receipt, ...(order.handover ? { handover: order.handover } : {}) };
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
  const secureCookie = process.env.COOKIE_SECURE === "true";
  function setCookie(response, token, maxAge = sessionDuration / 1000) {
    response.setHeader(
      "Set-Cookie",
      `me_admin=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${secureCookie ? "; Secure" : ""}`,
    );
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
    if (!value || value.expires <= Date.now() || !credentialsMatch) {
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
      if (route === "/api/health" && method === "GET")
        return json(response, 200, { ok: true });
      if (route === "/api/products" && method === "GET")
        return json(response, 200, { products: store.read().products });
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
      if (route === "/api/customer/auth/password" && method === "POST")
        return json(response, 200, {
          customer: customerAuth.passwordLogin(
            request,
            response,
            await body(request),
          ),
        });
      if (route === "/api/customer/password" && method === "POST")
        return json(response, 200, {
          customer: customerAuth.setPassword(
            request,
            response,
            await body(request),
          ),
        });
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
            .map((order) => ({ ...publicOrder(order), billIssued: store.read().bills.some((bill) => bill.orderId === order.id) }))
            .sort((a, b) => b.date.localeCompare(a.date)),
        });
      }
      const customerBill = route.match(/^\/api\/orders\/([^/]+)\/bill$/);
      if (customerBill && method === "GET") {
        const order = store.read().orders.find((item) => item.id === customerBill[1]);
        if (!order || (order.customerId
          ? customerAuth.session(request)?.customer.id !== order.customerId
          : !equal(request.headers["x-order-token"] || "", order.receiptToken)))
          throw new HttpError(404, "Bill not found.");
        const bill = store.read().bills.find((item) => item.orderId === order.id);
        if (!bill) throw new HttpError(404, "Bill has not been issued yet.");
        return sendBill(response, bill);
      }
      const repairLookup = route.match(/^\/api\/repairs\/([^/]+)$/);
      if (repairLookup && method === "GET") {
        const ticket = store.read().repairTickets.find((item) => item.id === repairLookup[1]);
        if (!ticket || !equal(request.headers["x-repair-token"] || "", ticket.token))
          throw new HttpError(404, "Repair ticket not found.");
        const publicTicket = { id: ticket.id, device: ticket.device, status: ticket.status,
          history: ticket.history.map(({ status, date }) => ({ status, date })) };
        return json(response, 200, { ticket: publicTicket });
      }
      if (route === "/api/admin/session" && method === "GET") {
        const active = session(request);
        return json(response, 200, {
          user: active
            ? { username: active.username, role: active.role }
            : null,
          configured,
        });
      }
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
          if (value.expires <= Date.now()) sessions.delete(key);
        const token = randomBytes(32).toString("hex");
        const accountUsername = owner ? username : staff.username;
        const role = owner ? "owner" : "staff";
        sessions.set(sessionKey(token), {
          username: accountUsername,
          role,
          ...(staff
            ? { staffId: staff.id, accessVersion: staff.accessVersion }
            : {}),
          credentialHash: credential,
          expires: Date.now() + sessionDuration,
        });
        setCookie(response, token);
        return json(response, 200, {
          user: { username: accountUsername, role },
        });
      }
      if (route === "/api/admin/logout" && method === "POST") {
        const current = session(request);
        if (current) sessions.delete(sessionKey(current.token));
        setCookie(response, "", 0);
        return json(response, 200, { ok: true });
      }
      if (route.startsWith("/api/admin/") && !session(request))
        throw new HttpError(401, "Please sign in to the admin area.");
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
      if (route === "/api/admin/bills" && method === "GET")
        return json(response, 200, { bills: store.read().bills.slice().reverse() });
      if (route === "/api/admin/bills" && method === "POST") {
        const bill = issueBill(store, await body(request), session(request));
        return json(response, 201, { bill });
      }
      const adminBillPdf = route.match(/^\/api\/admin\/bills\/([^/]+)\/pdf$/);
      if (adminBillPdf && method === "GET") {
        const bill = store.read().bills.find((item) => item.id === adminBillPdf[1]);
        if (!bill) throw new HttpError(404, "Bill not found.");
        return sendBill(response, bill);
      }
      if (route === "/api/admin/repairs" && method === "GET")
        return json(response, 200, { tickets: store.read().repairTickets.slice().reverse() });
      if (route === "/api/admin/repairs" && method === "POST") {
        const input = await body(request);
        const current = store.read();
        const ticket = {
          id: `ME-R${String(current.repairTickets.length + 1).padStart(6, "0")}`,
          token: randomBytes(16).toString("hex"),
          customerName: text(input.customerName, "Customer name", 2, 100),
          phone: text(input.phone, "Phone", 10, 20),
          device: text(input.device, "Device", 2, 120),
          problem: text(input.problem, "Problem", 2, 1000),
          status: "Received",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [{ status: "Received", date: new Date().toISOString(), by: session(request).username }],
        };
        store.commit({ ...current, repairTickets: [...current.repairTickets, ticket] });
        return json(response, 201, { ticket });
      }
      const repairUpdate = route.match(/^\/api\/admin\/repairs\/([^/]+)$/);
      if (repairUpdate && method === "PATCH") {
        const input = await body(request);
        const statuses = ["Received", "Inspecting", "Awaiting approval", "Repairing", "Ready", "Collected", "Cancelled"];
        if (!statuses.includes(input.status)) throw new HttpError(400, "Select a valid repair status.");
        const current = store.read();
        const ticket = current.repairTickets.find((item) => item.id === repairUpdate[1]);
        if (!ticket) throw new HttpError(404, "Repair ticket not found.");
        if (ticket.status === input.status) return json(response, 200, { ticket });
        if (["Collected", "Cancelled"].includes(ticket.status)) throw new HttpError(409, "Repair ticket is closed.");
        const date = new Date().toISOString();
        const updated = { ...ticket, status: input.status, updatedAt: date,
          history: [...ticket.history, { status: input.status, date, by: session(request).username }] };
        store.commit({ ...current, repairTickets: current.repairTickets.map((item) => item.id === ticket.id ? updated : item) });
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
        if (order.status === input.status)
          return json(response, 200, {
            order: {
              ...adminOrder(order),
              emailNotifications: emailSummary(order, current.emailQueue),
            },
          });
        if (["Cancelled", "Completed"].includes(order.status))
          throw new HttpError(
            409,
            "This order is closed. Cancelled and completed orders cannot be changed.",
          );
        if (input.status === "Completed" && order.status !== "Ready for pickup")
          throw new HttpError(409, "Mark the order ready before pickup.");
        if (input.status === "Completed" && input?.pickupReference !== order.id)
          throw new HttpError(400, "Verify the customer's order reference before handover.");
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
          ...(input.status === "Completed" ? { handover: { date: new Date().toISOString(), by: session(request).username } } : {}),
          ...(releaseStock ? { stockReserved: false } : {}),
          history: [
            ...(order.history || [{ status: order.status, date: order.date }]),
            { status: input.status, date: new Date().toISOString() },
          ],
        };
        const email = createOrderEmail(updated);
        store.commit({
          ...current,
          products,
          orders: current.orders.map((o) => (o.id === order.id ? updated : o)),
          emailQueue: email
            ? [...current.emailQueue, email]
            : current.emailQueue,
        });
        sendQueuedEmails();
        return json(response, 200, {
          order: {
            ...adminOrder(updated),
            emailNotifications: emailSummary(updated, store.read().emailQueue),
          },
        });
      }
      if (route === "/api/admin/products" && method === "POST") {
        const product = validateProduct(await body(request));
        product.id = randomUUID();
        product.reviewedAt = new Date().toISOString();
        if (product.inspection && (Object.values(product.inspection.checks).some((value) => value !== "not_checked") || product.inspection.defects || product.inspection.included))
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
      const reviewRoute = route.match(/^\/api\/admin\/products\/([^/]+)\/review$/);
      if (reviewRoute && method === "POST") {
        const current = store.read();
        const product = current.products.find((p) => p.id === reviewRoute[1]);
        if (!product) throw new HttpError(404, "Product not found.");
        const updated = { ...product, reviewedAt: new Date().toISOString() };
        store.commit({ ...current, products: current.products.map((p) => p.id === product.id ? updated : p) });
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
        const updated = validateProduct(input, product);
        if (updated.price !== product.price || updated.stockQuantity !== product.stockQuantity)
          updated.reviewedAt = new Date().toISOString();
        if (updated.inspection && JSON.stringify(updated.inspection) !== JSON.stringify(product.inspection))
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
        const total = items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0,
        );
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
          fulfillment: "Shop pickup",
          receiptToken: randomBytes(32).toString("hex"),
          requestId: customer.requestId,
          fingerprint,
          stockReserved: true,
        };
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
        return json(response, 200, { order: { ...publicOrder(order), billIssued: store.read().bills.some((bill) => bill.orderId === order.id) } });
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
