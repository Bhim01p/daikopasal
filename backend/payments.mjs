export const PAYMENT_METHODS = ["PAY_AT_SHOP", "MANUAL_QR", "ESEWA"];
export const PAYMENT_STATUSES = ["PENDING", "VERIFICATION_PENDING", "PAID", "REJECTED", "FAILED", "REFUNDED"];

export function paymentProvider(payment) {
  if (payment?.provider) return payment.provider;
  // Orders created before provider separation used ESEWA for the manual QR flow.
  return payment?.method === "ESEWA" ? "MANUAL_QR" : payment?.method;
}

export function createPayment({ orderId, method, amount, now = new Date().toISOString() }) {
  const provider = method === "PAY_AT_SHOP" ? "SHOP" : method;
  return {
    orderId,
    method,
    status: method === "PAY_AT_SHOP" ? "PENDING" : "PENDING",
    amount,
    currency: "NPR",
    provider,
    verificationType: method === "MANUAL_QR" ? "ADMIN" : method === "ESEWA" ? "GATEWAY" : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function updatePayment(payment, change, now = new Date().toISOString()) {
  return { ...payment, ...change, updatedAt: now };
}
