import { translateCurrent } from "../context/LanguageContext";
import type { Order } from "../types";
import { money, shop } from "../data/shop";
import { api } from "./api";
export function orderMessage(order: Order) {
  const t = translateCurrent;
  const sample = order.items.some(({ product }) => product.isSample !== false);
  return [
    t("Hello {{name}},", { name: shop.name }),
    t("I have a question about my pickup order."),
    "",
    `${t("Reference")}: ${order.id}`,
    `${t("Status")}: ${t(order.status)}`,
    `${t("Customer")}: ${order.name}`,
    `${t("Phone number")}: ${order.phone}`,
    "",
    t("Items"),
    ...order.items.map(
      (i) =>
        `${i.product.brand} ${i.product.name} × ${i.quantity} — ${money(i.product.price * i.quantity)}`,
    ),
    "",
    `${t(sample ? "Sample total" : "Total")}: ${money(order.total)}`,
    `${t("Collection")}: ${t("Shop pickup in Lekhnath")}`,
    ...(order.note ? [`${t("Note")}: ${order.note}`] : []),
  ].join("\n");
}
export function readOrders(): Order[] {
  try {
    const data = JSON.parse(localStorage.getItem("me-orders") || "[]");
    return Array.isArray(data)
      ? data.filter(
          (o) =>
            typeof o?.id === "string" &&
            typeof o?.name === "string" &&
            typeof o?.phone === "string" &&
            typeof o?.note === "string" &&
            typeof o?.date === "string" &&
            Number.isFinite(Date.parse(o.date)) &&
            typeof o?.total === "number" &&
            Number.isFinite(o.total) &&
            o.total >= 0 &&
            o?.fulfillment === "Shop pickup" &&
            [
              "Awaiting shop confirmation",
              "Confirmed",
              "Ready for pickup",
              "Completed",
              "Cancelled",
            ].includes(o?.status) &&
            Array.isArray(o?.items) &&
            o.items.length > 0 &&
            o.items.every(
              (i: {
                product?: {
                  id?: unknown;
                  name?: unknown;
                  brand?: unknown;
                  price?: unknown;
                };
                quantity?: unknown;
              }) =>
                typeof i?.product?.id === "string" &&
                typeof i.product.name === "string" &&
                typeof i.product.brand === "string" &&
                typeof i.product.price === "number" &&
                Number.isFinite(i.product.price) &&
                i.product.price >= 0 &&
                typeof i.quantity === "number" &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0 &&
                i.quantity <= 10,
            ),
        )
      : [];
  } catch {
    return [];
  }
}
export function saveOrder(order: Order) {
  if (order.accountOrder) return; // Account receipts are fetched through the authenticated session.
  try {
    localStorage.setItem(
      "me-orders",
      JSON.stringify([
        ...readOrders()
          .filter((existing) => existing.id !== order.id)
          .slice(-19),
        order,
      ]),
    );
  } catch {
    /* The server is authoritative if browser storage is unavailable. */
  }
}
export async function createOrder(input: {
  language?: "en" | "ne";
  name: string;
  accountOrder?: boolean;
  email: string;
  phone: string;
  note: string;
  items: { productId: string; quantity: number }[];
  expectedTotal: number;
  fulfillmentMethod?: "PICKUP" | "DELIVERY";
  paymentMethod?: "MANUAL_QR" | "PAY_AT_SHOP";
  deliveryAddress?: Record<string, string>;
  requestId: string;
}) {
  return (
    await api<{ order: Order }>("/orders", {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).order;
}
