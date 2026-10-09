import { normalizeDigits } from "../shared/locale.mjs";
import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { HttpError, text } from "./validation.mjs";
import { stateMap } from "./state-map.mjs";

export function normalizePhone(value) {
  let number = text(normalizeDigits(value), "Phone number", 10, 20).replace(
    /[\s()-]/g,
    "",
  );
  if (/^\+9779[78]\d{8}$/.test(number)) number = number.slice(4);
  else if (/^9779[78]\d{8}$/.test(number)) number = number.slice(3);
  if (!/^9[78]\d{8}$/.test(number))
    throw new HttpError(400, "Enter a valid Nepal mobile number.");
  return `+977${number}`;
}
export function profileComplete(customer) {
  return !!customer?.name && !!customer?.email;
}
export function publicCustomer(customer) {
  return customer
    ? {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        profileComplete: profileComplete(customer),
      }
    : null;
}
const hash = (value) => createHash("sha256").update(value).digest("hex");
const equal = (a, b) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const localHosts = ["localhost", "127.0.0.1", "[::1]", "::1"];

export function createCustomerAuth(store, options = {}) {
  const configuredMode =
    options.mode ?? process.env.CUSTOMER_AUTH_MODE ?? "disabled";
  const sms = options.smsTransport;
  const now = options.now || Date.now;
  const lifetime = 7 * 24 * 60 * 60 * 1000;
  const challenges = stateMap(store, "customerChallenges");
  const limits = stateMap(store, "customerLimits");
  function mode(request) {
    if (configuredMode === "sms" && sms) return "sms";
    if (
      configuredMode !== "development" ||
      process.env.NODE_ENV === "production"
    )
      return "disabled";
    if (process.env.HOST && !localHosts.includes(process.env.HOST))
      return "disabled";
    const address = request.socket.remoteAddress;
    const hostname = new URL(`http://${request.headers.host}`).hostname;
    return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address) &&
      localHosts.includes(hostname)
      ? "development"
      : "disabled";
  }
  function cookie(response, token, maxAge = lifetime / 1000) {
    response.setHeader(
      "Set-Cookie",
      `me_customer=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${process.env.COOKIE_SECURE === "true" ? "; Secure" : ""}`,
    );
  }
  function session(request) {
    if (mode(request) === "disabled") return null;
    const token = request.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("me_customer="))
      ?.slice("me_customer=".length);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const entry = store
      .read()
      .customerSessions.find(
        (entry) => entry.tokenHash === hash(token) && entry.expiresAt > now(),
      );
    if (!entry) return null;
    const customer = store
      .read()
      .customers.find((customer) => customer.id === entry.customerId);
    if (
      !customer ||
      (entry.mode === "development" && mode(request) !== "development")
    )
      return null;
    return { customer, tokenHash: entry.tokenHash };
  }
  function requireSession(request) {
    const result = session(request);
    if (!result)
      throw new HttpError(401, "Please sign in to your customer account.");
    return result;
  }
  async function start(request, input) {
    const currentMode = mode(request);
    if (currentMode === "disabled")
      throw new HttpError(
        503,
        "Phone login is not enabled yet. You can still use guest checkout.",
      );
    const phone = normalizePhone(input?.phone);
    if (
      currentMode === "development" &&
      store
        .read()
        .customers.some(
          (customer) =>
            customer.phone === phone && customer.verifiedVia === "sms",
        )
    )
      throw new HttpError(
        403,
        "A verified customer account cannot use development login.",
      );
    for (const [id, challenge] of challenges)
      if (challenge.expiresAt <= now()) challenges.delete(id);
    for (const [key, limit] of limits)
      if (limit.until <= now()) limits.delete(key);
    const existing = [...challenges.values()].find(
      (challenge) => challenge.phone === phone,
    );
    if (existing && existing.createdAt + 60000 > now())
      throw new HttpError(
        429,
        "Please wait one minute before requesting another code.",
      );
    const keys = [
      [`phone:${phone}`, 5],
      [`ip:${request.clientIp || request.socket.remoteAddress}`, 10],
    ];
    for (const [key, maximum] of keys)
      if ((limits.get(key)?.count || 0) >= maximum)
        throw new HttpError(
          429,
          "Too many login codes requested. Try again later.",
        );
    for (const [key] of keys) {
      const limit = limits.get(key);
      limits.set(key, {
        count: (limit?.count || 0) + 1,
        until: limit?.until || now() + 3600000,
      });
    }
    for (const [id, challenge] of challenges)
      if (challenge.phone === phone) challenges.delete(id);
    const id = randomBytes(24).toString("hex");
    const code = randomInt(100000, 1000000).toString();
    const challenge = {
      phone,
      codeHash: hash(`${id}:${code}`),
      mode: currentMode,
      createdAt: now(),
      expiresAt: now() + 300000,
      attempts: 0,
    };
    challenges.set(id, challenge);
    if (currentMode === "sms") {
      try {
        await sms.sendOTP(phone, code);
      } catch {
        challenges.delete(id);
        throw new HttpError(
          503,
          "We could not send the login code. Please try again later.",
        );
      }
    }
    return {
      challengeId: id,
      expiresAt: challenge.expiresAt,
      mode: currentMode,
      ...(currentMode === "development" ? { developmentCode: code } : {}),
    };
  }
  function verify(request, response, input) {
    const id = text(input?.challengeId, "Login reference", 48, 48);
    const code = text(normalizeDigits(input?.code), "Verification code", 6, 6);
    const challenge = challenges.get(id);
    if (
      !challenge ||
      challenge.expiresAt <= now() ||
      challenge.mode !== mode(request)
    ) {
      challenges.delete(id);
      throw new HttpError(400, "Your code has expired. Request a new code.");
    }
    challenge.attempts++;
    challenges.set(id, challenge);
    if (!equal(challenge.codeHash, hash(`${id}:${code}`))) {
      if (challenge.attempts >= 5) challenges.delete(id);
      throw new HttpError(
        400,
        challenge.attempts >= 5
          ? "Too many incorrect codes. Request a new code."
          : "That code is incorrect. Please try again.",
      );
    }
    challenges.delete(id);
    const current = store.read();
    let customer = current.customers.find(
      (customer) => customer.phone === challenge.phone,
    );
    customer = customer
      ? { ...customer, verifiedVia: challenge.mode }
      : {
          id: randomUUID(),
          phone: challenge.phone,
          name: "",
          email: "",
          verifiedVia: challenge.mode,
          createdAt: new Date(now()).toISOString(),
        };
    const token = randomBytes(32).toString("hex");
    const oldToken = session(request)?.tokenHash;
    store.commit({
      ...current,
      customers: [
        ...current.customers.filter((entry) => entry.id !== customer.id),
        customer,
      ],
      customerSessions: [
        ...current.customerSessions.filter(
          (entry) => entry.expiresAt > now() && entry.tokenHash !== oldToken,
        ),
        {
          tokenHash: hash(token),
          customerId: customer.id,
          mode: challenge.mode,
          expiresAt: now() + lifetime,
        },
      ],
    });
    cookie(response, token);
    return publicCustomer(customer);
  }
  function updateProfile(request, input) {
    const { customer } = requireSession(request);
    const name = text(input?.name, "Full name", 2, 100);
    const email = text(input?.email, "Email address", 3, 254);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
      throw new HttpError(
        400,
        "Enter a valid email address for order updates.",
      );
    const updated = {
      ...customer,
      name,
      email,
      updatedAt: new Date(now()).toISOString(),
    };
    const current = store.read();
    store.commit({
      ...current,
      customers: current.customers.map((entry) =>
        entry.id === customer.id ? updated : entry,
      ),
    });
    return publicCustomer(updated);
  }
  function logout(request, response) {
    const entry = session(request);
    if (entry) {
      const current = store.read();
      store.commit({
        ...current,
        customerSessions: current.customerSessions.filter(
          (item) => item.tokenHash !== entry.tokenHash,
        ),
      });
    }
    cookie(response, "", 0);
  }
  return {
    mode,
    session,
    requireSession,
    start,
    verify,
    updateProfile,
    logout,
  };
}
