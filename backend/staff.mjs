import { randomUUID } from "node:crypto";
import {
  validateAdminCredentials,
  hashAdminPassword,
} from "./admin-settings.mjs";
import { HttpError, text } from "./validation.mjs";

export function publicStaff(account) {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    enabled: account.enabled,
    permissions: account.permissions || {
      orders: true,
      sales: true,
      billing: true,
      inventory: true,
      repairs: true,
      paymentQr: false,
    },
    createdAt: account.createdAt,
  };
}

export function saveStaff(store, ownerUsername, input, id) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(400, "Invalid staff account.");
  const current = store.read();
  const accounts = current.staffAccounts || [];
  const existing = id ? accounts.find((account) => account.id === id) : null;
  if (id && !existing) throw new HttpError(404, "Staff account not found.");
  if (!id && accounts.length >= 50)
    throw new HttpError(400, "The shop can have up to 50 staff accounts.");
  const username = text(
    input.username ?? existing?.username,
    "Username",
    3,
    40,
  );
  const name = text(input.name ?? existing?.name, "Staff name", 2, 100);
  try {
    validateAdminCredentials(
      username,
      input.password === undefined && existing
        ? "validation-placeholder-only"
        : input.password,
    );
  } catch (error) {
    throw new HttpError(400, error.message);
  }
  if (
    username.toLowerCase() === ownerUsername.toLowerCase() ||
    accounts.some(
      (account) =>
        account.id !== id &&
        account.username.toLowerCase() === username.toLowerCase(),
    )
  )
    throw new HttpError(409, "This username is already in use.");
  if (input.enabled !== undefined && typeof input.enabled !== "boolean")
    throw new HttpError(400, "Invalid staff account.");
  const account = {
    id: existing?.id || randomUUID(),
    username,
    name,
    role: "staff",
    enabled: input.enabled ?? existing?.enabled ?? true,
    passwordHash:
      input.password === undefined && existing
        ? existing.passwordHash
        : hashAdminPassword(input.password),
    accessVersion: (existing?.accessVersion || 0) + 1,
    permissions: {
      orders: input.permissions?.orders !== false,
      sales: input.permissions?.sales !== false,
      billing: input.permissions?.billing !== false,
      inventory: input.permissions?.inventory !== false,
      repairs: input.permissions?.repairs !== false,
      paymentQr: input.permissions?.paymentQr === true,
    },
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  // Client-supplied roles/owner credentials are deliberately never copied.
  store.commit({
    ...current,
    staffAccounts: existing
      ? accounts.map((item) => (item.id === id ? account : item))
      : [...accounts, account],
  });
  return publicStaff(account);
}
