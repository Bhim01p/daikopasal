import { translate } from "../shared/locale.mjs";
import { randomUUID } from "node:crypto";
import { createGmailTransport } from "./gmail.mjs";

export const shop = {
  name: "Machhapuchhree Electronics",
  location: "43MM+778, Lekhnath, Gandaki Province 33700",
  hours: "8 AM–6 PM",
  phone: "9806600444",
};
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
const money = (value) => `Rs. ${value.toLocaleString("en-NP")}`;
const descriptions = {
  "Awaiting shop confirmation":
    "We received your order. The shop still needs to confirm availability, prices and pickup timing.",
  Confirmed:
    "The shop has confirmed your order. Contact us if you need to arrange your pickup time.",
  "Ready for pickup":
    "Your order is ready to collect. Please bring your order reference when visiting the shop.",
  Completed:
    "Your pickup order has been marked completed. Thank you for shopping with us.",
  Cancelled:
    "Your order has been cancelled. Contact the shop if you have any questions.",
};
export function createOrderEmail(order, kind = "status") {
  if (!order.email) return null; // Older orders may not have an email address.
  const t = (key) => translate(key, order.language === "ne" ? "ne" : "en");
  const title =
    kind === "received" ? "Order received" : `Order update: ${order.status}`;
  const sample = order.items.some(({ product }) => product.isSample !== false);
  const totalLabel = sample ? "Sample total" : "Total";
  const items = order.items.map(
    ({ product, quantity }) =>
      `${product.brand} ${product.name} × ${quantity} — ${money(product.price * quantity)}`,
  );
  const summary = descriptions[order.status];
  let text = [
    `Hello ${order.name},`,
    "",
    title,
    `Reference: ${order.id}`,
    `Status: ${order.status}`,
    "",
    summary,
    "",
    ...items,
    "",
    `${totalLabel}: ${money(order.total)}`,
    ...(sample
      ? [
          "This order includes sample listings. Confirm actual prices and availability with the shop.",
        ]
      : []),
    ...(order.note ? [`Your note: ${order.note}`] : []),
    "",
    `Shop pickup: ${shop.location}`,
    `Open ${shop.hours}`,
    "Payment is arranged with the shop at pickup. No online payment has been taken.",
    `Questions? Call ${shop.phone}.`,
    "",
    shop.name,
  ].join("\n");
  let html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f7;color:#222228;font-family:Arial,sans-serif;font-size:16px;line-height:1.6">
    <div style="max-width:600px;margin:auto;padding:28px;background:white;border-top:5px solid #d70750">
    <p style="font-weight:bold">${shop.name}</p><h1 style="font-size:26px">${escape(title)}</h1>
    <p>Hello ${escape(order.name)},</p><p>${escape(summary)}</p>
    <p><strong>Reference:</strong> ${escape(order.id)}<br><strong>Status:</strong> ${escape(order.status)}</p>
    <ul>${items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
    <p><strong>${totalLabel}: ${escape(money(order.total))}</strong></p>
    ${sample ? "<p>This order includes sample listings. Confirm actual prices and availability with the shop.</p>" : ""}
    ${order.note ? `<p>Your note: ${escape(order.note)}</p>` : ""}
    <p><strong>Shop pickup</strong><br>${shop.location}<br>Open ${shop.hours}</p>
    <p>Payment is arranged with the shop at pickup. No online payment has been taken.</p>
    <p>Questions? Call <a href="tel:+977${shop.phone}">${shop.phone}</a>.</p></div></body></html>`;
  if (order.language === "ne") {
    const paragraphs = [
      translate("Hello {{name}},", "ne", { name: order.name }),
      kind === "received"
        ? t("Order received")
        : translate("Order update: {{status}}", "ne", {
            status: t(order.status),
          }),
      `${t("Reference")}: ${order.id}`,
      `${t("Status")}: ${t(order.status)}`,
      t(summary),
      ...items,
      `${t(totalLabel)}: ${money(order.total)}`,
      ...(sample
        ? [
            t(
              "This order includes sample listings. Confirm actual prices and availability with the shop.",
            ),
          ]
        : []),
      ...(order.note ? [`${t("Your note")}: ${order.note}`] : []),
      `${t("Shop pickup")}: ${shop.location}`,
      `${t("Open")} ${shop.hours}`,
      t(
        "Payment is arranged with the shop at pickup. No online payment has been taken.",
      ),
      translate("Questions? Call {{phone}}.", "ne", { phone: shop.phone }),
    ];
    text = paragraphs.join("\n\n");
    html = `<!doctype html><html lang="ne"><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.8;padding:24px"><h1>${escape(t("Machhapuchhree Electronics"))}</h1>${paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}</body></html>`;
  }
  return {
    id: randomUUID(),
    orderId: order.id,
    kind,
    orderStatus: order.status,
    createdAt: new Date().toISOString(),
    state: "queued",
    attempts: 0,
    nextAttemptAt: 0,
    message: {
      to: [order.email],
      subject: `${order.language === "ne" ? (kind === "received" ? t("Order received") : translate("Order update: {{status}}", "ne", { status: t(order.status) })) : title} · ${order.id} · ${shop.name}`,
      text,
      html,
    },
  };
}

export function createEmailTransport(env = process.env, fetcher = fetch) {
  if (env.EMAIL_PROVIDER === "gmail") return createGmailTransport(env);
  if (env.EMAIL_PROVIDER !== "resend" || !env.RESEND_API_KEY || !env.EMAIL_FROM)
    return null;
  if (
    /[\r\n]/.test(env.EMAIL_FROM) ||
    (env.EMAIL_REPLY_TO && /[\r\n]/.test(env.EMAIL_REPLY_TO))
  )
    throw new Error("Email sender configuration must not contain newlines.");
  return {
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO || undefined,
    async send(message, id) {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `order-email/${id}`,
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        const error = new Error(
          `Email service rejected the request (HTTP ${response.status}).`,
        );
        error.permanent =
          response.status >= 400 &&
          response.status < 500 &&
          ![408, 429].includes(response.status);
        throw error;
      }
      const result = await response.json();
      if (typeof result.id !== "string" || !result.id)
        throw new Error("Email service did not acknowledge the message.");
      return result.id;
    },
  };
}

export function createEmailWorker(
  store,
  transport,
  { now = Date.now, automatic = true } = {},
) {
  let draining = false;
  let stopped = false;
  const delays = [60000, 300000, 900000, 3600000];
  const scope = (callback) =>
    store.transaction ? store.transaction(callback) : callback();
  function update(id, change) {
    const current = store.read();
    store.commit({
      ...current,
      emailQueue: current.emailQueue.map((job) =>
        job.id === id ? { ...job, ...change } : job,
      ),
    });
  }
  async function drain({ maxJobs = Infinity, maxDurationMs = Infinity } = {}) {
    if (!transport || draining || stopped) return;
    draining = true;
    const startedAt = Date.now();
    let processed = 0;
    try {
      for (;;) {
        if (
          stopped ||
          processed >= maxJobs ||
          Date.now() - startedAt >= maxDurationMs
        )
          break;
        const claimed = await scope(() => {
          const queue = store.read().emailQueue;
          const job = queue.find(
            (candidate, index) =>
              candidate.state === "queued" &&
              candidate.nextAttemptAt <= now() &&
              (!candidate.leaseUntil || candidate.leaseUntil <= now()) &&
              !queue
                .slice(0, index)
                .some(
                  (earlier) =>
                    earlier.orderId === candidate.orderId &&
                    earlier.state === "queued",
                ),
          );
          if (!job) return null;
          if (job.sendInProgress && job.deliveryProvider === "gmail") {
            update(job.id, {
              state: "failed",
              sendInProgress: false,
              leaseUntil: 0,
              error:
                "Gmail delivery was interrupted. Check Gmail and the recipient before manually retrying this email.",
            });
            return { skipped: true };
          }
          // Resend retains idempotency keys for 24 hours. Pause before that expires.
          if (
            transport.supportsIdempotency !== false &&
            job.firstAttemptAt &&
            now() - job.firstAttemptAt >= 23 * 60 * 60 * 1000
          ) {
            update(job.id, {
              state: "failed",
              error:
                "Review this message in the email provider before resending; the duplicate-prevention window has elapsed.",
            });
            return { skipped: true };
          }
          const attempts = job.attempts + 1;
          const message = job.deliveryMessage || {
            ...job.message,
            from: transport.from,
            ...(transport.replyTo ? { reply_to: transport.replyTo } : {}),
          };
          // Save before sending, so a restart retries the same content and key.
          update(job.id, {
            attempts,
            firstAttemptAt: job.firstAttemptAt || now(),
            deliveryMessage: message,
            sendInProgress: true,
            leaseUntil: now() + 90000,
            deliveryProvider: transport.provider || "resend",
          });
          return { job, attempts, message };
        });
        if (!claimed) break;
        processed++;
        if (claimed.skipped) continue;
        const { job, attempts, message } = claimed;
        let providerId;
        try {
          providerId = await transport.send(message, job.id);
        } catch (error) {
          await scope(() =>
            update(job.id, {
              state: error.permanent || attempts >= 5 ? "failed" : "queued",
              nextAttemptAt:
                now() + delays[Math.min(attempts - 1, delays.length - 1)],
              error: error.permanent
                ? error.message
                : attempts >= 5
                  ? "Email service unavailable after five attempts. Check the service before retrying."
                  : "Email service unavailable. Delivery will be retried.",
              sendInProgress: false,
              leaseUntil: 0,
            }),
          );
          continue;
        }
        // A database failure after acceptance must leave the in-flight marker.
        // Treating it as a send failure could deliver the SMTP email twice.
        await scope(() =>
          update(job.id, {
            state: "accepted",
            acceptedAt: new Date(now()).toISOString(),
            providerId,
            error: null,
            sendInProgress: false,
            leaseUntil: 0,
          }),
        );
      }
    } finally {
      draining = false;
    }
  }
  const timer = automatic
    ? setInterval(
        () =>
          void drain().catch(() =>
            console.error("Email queue could not be processed."),
          ),
        15000,
      )
    : null;
  timer?.unref();
  return {
    configured: !!transport,
    drain,
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}

export function emailSummary(order, queue) {
  return queue
    .filter((job) => job.orderId === order.id)
    .map(({ id, kind, orderStatus, state, createdAt, acceptedAt, error }) => ({
      id,
      kind,
      orderStatus,
      state,
      createdAt,
      acceptedAt,
      error,
    }));
}
