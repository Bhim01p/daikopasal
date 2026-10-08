import type { Order } from "../types";
import { money, shop } from "../data/shop";
import { api } from "./api";
export function orderMessage(order: Order) {
  const sample = order.items.some(({ product }) => product.isSample !== false);
  return `Hello ${shop.name},\nI have a question about my pickup order.\n\nReference: ${order.id}\nStatus: ${order.status}\nCustomer: ${order.name}\nPhone: ${order.phone}\n\nItems:\n${order.items.map((i) => `${i.product.brand} ${i.product.name} × ${i.quantity} — ${money(i.product.price * i.quantity)}`).join("\n")}\n\n${sample ? "Sample total" : "Total"}: ${money(order.total)}\nCollection: Shop pickup in Lekhnath\n${order.note ? `Note: ${order.note}\n` : ""}`;
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
  name: string;
  accountOrder?: boolean;
  email: string;
  phone: string;
  note: string;
  items: { productId: string; quantity: number }[];
  expectedTotal: number;
  requestId: string;
}) {
  return (
    await api<{ order: Order }>("/orders", {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).order;
}
