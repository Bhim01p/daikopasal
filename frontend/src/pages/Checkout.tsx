import CancellationPolicy from "../components/CancellationPolicy";
import { currentLanguage, useT } from "../context/LanguageContext";
import { normalizeDigits } from "../../../shared/locale.mjs";
import { useLanguage } from "../context/LanguageContext";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  MapPin,
  Check,
  MessageCircle,
  Copy,
  ArrowUpRight,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import { money, shop, shopDirections, whatsapp } from "../data/shop";
import {
  orderMessage,
  readOrders,
  saveOrder,
  createOrder,
} from "../utils/orders";
import { api, ApiError } from "../utils/api";
import type { Order } from "../types";
import { EmptyBag } from "./Cart";
import { isSampleProduct } from "../utils/products";
import { useCustomer } from "../context/CustomerContext";
export default function Checkout() {
  const t = useT();
  const { language } = useLanguage();
  const { customer, checking, setCustomer } = useCustomer();
  const { products, refresh } = useProducts();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  useEffect(() => {
    requestId.current = crypto.randomUUID();
  }, [customer?.id]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const details = customer || { name, email, phone };
    const next: Record<string, string> = {};
    if (details.name.trim().length < 2)
      next.name = "Please enter your full name.";
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(details.email.trim()))
      next.email = "Enter a valid email address for order updates.";
    if (
      !/^(?:\+977|977)?9[78]\d{8}$/.test(
        normalizeDigits(details.phone).replace(/[\s()-]/g, ""),
      )
    )
      next.phone = "Enter a valid Nepal mobile number, such as 9806600444.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`customer-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const order = await createOrder({
        language,
        accountOrder: !!customer,
        name: details.name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim(),
        note: note.trim(),
        items,
        expectedTotal: total,
        requestId: requestId.current,
      });
      saveOrder(order);
      clear();
      navigate(`/order/${order.id}`, { state: { order } });
      void refresh().catch(() => {});
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setCustomer(null);
      await refresh().catch(() => {});
      setErrors({
        save:
          error instanceof Error
            ? error.message
            : "Your order could not be saved. Please try again.",
      });
      setSaving(false);
    }
  }
  return (
    <div className="container standard-page">
      <span className="eyebrow">{t("Collect your next upgrade")}</span>
      <h1>
        {customer?.profileComplete
          ? t("Review your pickup order.")
          : t("Let’s get your details.")}
      </h1>
      {!items.length ? (
        <EmptyBag />
      ) : (
        <div className="cart-layout">
          <form className="checkout-form" onSubmit={submit} noValidate>
            <h2>{t("Customer details")}</h2>
            {customer ? (
              <div className="saved-customer">
                {customer.profileComplete ? (
                  <>
                    <strong>{customer.name}</strong>
                    <p>{customer.phone}</p>
                    <p>{customer.email}</p>
                    <p className="summary-note">
                      {t("Using your saved profile details.")}
                    </p>
                  </>
                ) : (
                  <p>
                    {t(
                      "Complete your name and phone number before placing your order.",
                    )}
                  </p>
                )}
                <Link className="text-link" to="/account?edit=1&next=/checkout">
                  {customer.profileComplete
                    ? t("Edit saved details")
                    : t("Complete your profile")}
                </Link>
              </div>
            ) : (
              <>
                <p>
                  <Link className="text-link" to="/login?next=/checkout">
                    {t("Log in to use saved details")}
                  </Link>{" "}
                  {t("or continue as a guest.")}
                </p>
                <p>
                  {t(
                    "We’ll save these details with your pickup order for the shop.",
                  )}
                </p>
                <label htmlFor="customer-name">
                  {t("Full name ")}
                  <span>*</span>
                </label>
                <input
                  id="customer-name"
                  autoComplete="name"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  required
                />
                {errors.name && (
                  <p id="name-error" className="field-error">
                    {errors.name}
                  </p>
                )}
                <label htmlFor="customer-phone">
                  {t("Phone number ")}
                  <span>*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t("98XXXXXXXX")}
                  value={phone}
                  maxLength={20}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  required
                />
                {errors.phone && (
                  <p id="phone-error" className="field-error">
                    {errors.phone}
                  </p>
                )}
                <label htmlFor="customer-email">
                  {t("Email address ")}
                  <span>*</span>
                </label>
                <input
                  id="customer-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t("you@example.com")}
                  value={email}
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : "email-help"}
                  required
                />
                <p id="email-help" className="summary-note">
                  {t(
                    "Use the email address where you want to receive order and pickup updates.",
                  )}
                </p>
                {errors.email && (
                  <p id="email-error" className="field-error">
                    {errors.email}
                  </p>
                )}
              </>
            )}
            <div className="pickup-panel">
              <MapPin size={22} />
              <div>
                <strong>{t("Shop pickup only")}</strong>
                <p>
                  {shop.address}
                  <br />
                  {t("Open ")}
                  {t(shop.hours)}
                  {t(". Confirm a pickup time with the shop.")}
                  <br />
                  {t(
                    "Wait for your ready-for-pickup notification before visiting. Bring your order reference when collecting.",
                  )}
                </p>
              </div>
            </div>
            <label htmlFor="order-note">
              {t("Order note ")}
              <span className="optional">{t("(optional)")}</span>
            </label>
            <textarea
              id="order-note"
              rows={4}
              maxLength={1000}
              placeholder={t(
                "A preferred pickup time or a question about your order…",
              )}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <CancellationPolicy />
            <div className="payment-panel">
              <strong>{t("Pay at pickup")}</strong>
              <p>
                {t(
                  "Arrange payment with the shop at pickup. Online payment is not available.",
                )}
              </p>
            </div>
            <p className="privacy-note">
              {t(
                "Your details are shared with the shop to arrange your pickup. You can also send the summary through WhatsApp for pickup confirmation.",
              )}
            </p>
            {errors.save && (
              <p className="field-error" role="alert">
                {errors.save}
              </p>
            )}
            <button
              className="button dark"
              disabled={
                saving || checking || (!!customer && !customer.profileComplete)
              }
              type="submit"
            >
              {saving ? t("Saving…") : t("Create pickup order")}
              <ArrowRight size={17} />
            </button>
          </form>
          <aside className="order-summary">
            <h2>{t("Your order")}</h2>
            {items.map((i) => {
              const p = products.find((p) => p.id === i.productId)!;
              if (!p) return null;
              return (
                <div key={p.id} className="summary-product">
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      {i.quantity} × {money(p.price)}
                    </span>
                  </div>
                  <strong>{money(p.price * i.quantity)}</strong>
                </div>
              );
            })}
            <div className="summary-line">
              <span>{t("Subtotal")}</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-line">
              <span>{t("Collection")}</span>
              <strong>{t("Shop pickup only")}</strong>
            </div>
            <div className="summary-line total">
              <strong>
                {items.some((item) =>
                  products.some(
                    (p) =>
                      p.id === item.productId &&
                      (p.priceIsEstimate || isSampleProduct(p)),
                  ),
                )
                  ? t("Estimated total")
                  : t("Total")}
              </strong>
              <strong>{money(total)}</strong>
            </div>
            <p className="summary-note">
              {t(
                "Your order will appear in the shop’s admin area. Prices and pickup timing will be confirmed by the shop.",
              )}
            </p>
            <Link className="text-link" to="/cart">
              {t("Edit your cart")}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
export function OrderSuccess({ id }: { id?: string }) {
  const t = useT();
  const { customer, checking } = useCustomer();
  const location = useLocation();
  const [order, setOrder] = useState<Order | undefined>(() => {
    const receipt = (location.state as { order?: Order } | null)?.order;
    return receipt && !receipt.accountOrder && receipt.id === id
      ? receipt
      : readOrders().find((o) => o.id === id && !o.accountOrder);
  });
  const [updatedAt, setUpdatedAt] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptError, setReceiptError] = useState("");
  const token = order?.receiptToken;
  useEffect(() => {
    if (!id || checking) return;
    let active = true;
    const refreshReceipt = () =>
      api<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, {
        headers: token ? { "X-Order-Token": token } : {},
      })
        .then((result) => {
          if (active) {
            setOrder(result.order);
            setReceiptError("");
            setUpdatedAt(new Date().toISOString());
            saveOrder(result.order);
          }
        })
        .catch((error) => {
          if (active && [401, 404].includes(error.status)) setOrder(undefined);
          else if (active)
            setReceiptError(
              "Your saved receipt is shown. We could not refresh its latest status.",
            );
        })
        .finally(() => {
          if (active) setReceiptLoading(false);
        });
    void refreshReceipt();
    const onFocus = () => {
      if (document.visibilityState === "visible") void refreshReceipt();
    };
    const timer = setInterval(onFocus, 20000);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [id, token, customer?.id, checking]);
  const [copied, setCopied] = useState(false);
  if (checking || receiptLoading)
    return (
      <div className="container empty-state" role="status">
        {t("Opening your order…")}
      </div>
    );
  if (!order)
    return (
      <div className="container standard-page empty-state">
        <h1>{t("Let’s find your order.")}</h1>
        {receiptError && <p role="alert">{t(receiptError)}</p>}
        {receiptError && (
          <button
            className="button white"
            onClick={() => window.location.reload()}
          >
            {t("Try again")}
          </button>
        )}
        <p>
          {t(
            "For an account order, log in with the email used for your account. For a guest order, use the original browser or contact the shop with your reference.",
          )}
        </p>
        <Link className="button dark" to="/cart">
          {t("Go to your cart")}
        </Link>
        {!customer && (
          <Link
            className="button white"
            to={`/login?next=${encodeURIComponent(`/order/${id}`)}`}
          >
            {t("Log in to view order")}
          </Link>
        )}
      </div>
    );
  return (
    <div className="container success-page">
      <div className="success-icon">
        <Check size={36} />
      </div>
      <span className="eyebrow">{t("Your pickup order")}</span>
      <h1>
        {order.status === "Completed"
          ? t("Your pickup is complete.")
          : order.status === "Cancelled"
            ? t("Your order has been cancelled.")
            : t("Your order has been received.")}
      </h1>
      <p>
        {t("Thank you, ")}
        {order.name}
        {t(". Your order has been received by the shop system.")}
        <br />
        <strong>
          {order.status === "Completed"
            ? t(
                "Thank you for shopping with us. Keep this receipt for your records.",
              )
            : order.status === "Cancelled"
              ? t(
                  "This order is closed. Contact the shop if you have a question.",
                )
              : order.status === "Ready for pickup"
                ? t(
                    "Your order is ready. Bring your order reference when collecting it. Open {{v0}}.",
                    { v0: String(shop.hours) },
                  )
                : order.status === "Confirmed"
                  ? t(
                      "The shop has confirmed your order. Contact us to arrange pickup timing.",
                    )
                  : t(
                      "Contact the shop to confirm availability and pickup timing.",
                    )}
        </strong>
      </p>
      <div className="reference">
        {order.id}
        <span>{t(order.status)}</span>
      </div>
      {updatedAt && (
        <p className="summary-note">
          {t("Last refreshed:")}{" "}
          {new Date(updatedAt).toLocaleTimeString(
            currentLanguage() === "ne" ? "ne-NP" : "en-GB",
            { timeZone: "Asia/Kathmandu" },
          )}
        </p>
      )}
      <a className="button dark full track-order-button" href="#order-progress">
        {t("Track order")} <ArrowRight size={17} />
      </a>
      {order.billIssued && <button className="button white full" onClick={async () => {
        const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/bill`, { credentials: "same-origin", headers: token ? { "X-Order-Token": token } : {} });
        if (!response.ok) { setReceiptError("Could not download the bill right now."); return; }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a"); link.href = url; link.download = `${order.id}-bill.pdf`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }}>{t("Download bill PDF")}</button>}
      <section id="order-progress" className="receipt-progress">
        <h2>{t("Order progress")}</h2>
        {order.history && (
          <ol className="order-history" aria-label={t("Order progress")}>
            {order.history.map((event, index) => (
              <li key={index}>
                <strong>{t(event.status)}</strong>
                <time dateTime={event.date}>
                  {new Date(event.date).toLocaleString(
                    currentLanguage() === "ne" ? "ne-NP" : "en-GB",
                    {
                      timeZone: "Asia/Kathmandu",
                    },
                  )}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
      {order.email && (
        <p className="summary-note">
          {t("Email for order updates: ")}
          <strong>{order.email}</strong>.
        </p>
      )}
      {receiptError && (
        <p role="status" className="summary-note">
          {t(receiptError)}
        </p>
      )}
      <div className="success-summary">
        <div className="summary-line">
          <span>{t("Created")}</span>
          <span>
            {new Date(order.date).toLocaleDateString(
              currentLanguage() === "ne" ? "ne-NP" : "en-GB",
              {
                timeZone: "Asia/Kathmandu",
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            )}
          </span>
        </div>
        {order.items.map((i) => (
          <div className="summary-line" key={i.product.id}>
            <span>
              {i.product.name} × {i.quantity}
            </span>
            <strong>{money(i.product.price * i.quantity)}</strong>
          </div>
        ))}
        <div className="summary-line total">
          <strong>
            {order.items.some(
              (item) =>
                item.product.priceIsEstimate || isSampleProduct(item.product),
            )
              ? t("Estimated total")
              : t("Total")}
          </strong>
          <strong>{money(order.total)}</strong>
        </div>
        <a
          className="button white full"
          href={shopDirections}
          target="_blank"
          rel="noreferrer"
        >
          {t("Directions to the shop ")}
          <ArrowUpRight size={16} />
        </a>
        <p className="summary-note">
          {t("Opening hours")}: {t(shop.hours)}
        </p>
        <div className="pickup-note">
          <MapPin size={17} />
          {t("Shop pickup · ")}
          {t(shop.location)}
        </div>
      </div>
      <a
        className="button teal full"
        href={whatsapp(orderMessage(order))}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={20} />
        {t("Contact shop about this order")}
        <ArrowUpRight size={17} />
      </a>
      <button
        className="button white full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(orderMessage(order));
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Copy size={16} />
        {copied ? t("Order summary copied") : t("Copy order summary")}
      </button>
      <p className="summary-note">
        {t(
          "Shop pickup only. Keep your order reference when contacting the shop.",
        )}
      </p>
      <Link className="text-link" to="/mobiles">
        {t("Continue exploring ")}
        <ArrowRight size={16} />
      </Link>
      {order.accountOrder && (
        <Link className="button white full" to="/my-orders">
          {t("Back to My orders")}
        </Link>
      )}
    </div>
  );
}
