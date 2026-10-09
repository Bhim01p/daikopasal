import { currentLanguage, useT } from "../context/LanguageContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ArrowRight, RefreshCw } from "lucide-react";
import { useCustomer } from "../context/CustomerContext";
import { api, ApiError } from "../utils/api";
import { money, shopDirections } from "../data/shop";
import type { Order } from "../types";

export default function MyOrders() {
  const t = useT();
  const { customer, checking, setCustomer } = useCustomer();
  const [result, setResult] = useState<{
    customerId: string;
    orders: Order[];
  } | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");
  const customerId = customer?.id;
  const activeCustomerId = useRef(customerId);
  activeCustomerId.current = customerId;
  const requestNumber = useRef(0);
  const refresh = useCallback(async () => {
    if (!customerId) return;
    const current = ++requestNumber.current;
    const isCurrent = () =>
      current === requestNumber.current &&
      customerId === activeCustomerId.current;
    setBusy(true);
    try {
      const response = await api<{ orders: Order[] }>("/customer/orders");
      if (!isCurrent()) return;
      setResult({ customerId, orders: response.orders });
      setUpdatedAt(new Date().toISOString());
      setError("");
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && error.status === 401) {
        setCustomer(null);
        setResult(null);
      } else
        setError(
          error instanceof Error
            ? error.message
            : "We could not refresh your orders.",
        );
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }, [customerId, setCustomer]);
  useEffect(() => {
    setResult(null);
    setError("");
    setFilter("all");
    void refresh();
    const onFocus = () => void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    window.addEventListener("focus", onFocus);
    return () => {
      requestNumber.current++;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  if (checking)
    return (
      <div className="container empty-state" role="status">
        {t("Opening your orders…")}
      </div>
    );
  if (!customer)
    return (
      <div className="container standard-page">
        <div className="empty-state shop-empty-state">
          <span className="shop-empty-icon">
            <Package size={36} aria-hidden="true" />
          </span>
          <h1>{t("Your orders, in one place.")}</h1>
          <p>
            {t(
              "Log in with your phone to follow orders placed through your account.",
            )}
          </p>
          <div className="shop-empty-actions">
            <Link className="button dark" to="/login?next=/my-orders">
              {t("Log in to see orders")}
              <ArrowRight size={18} />
            </Link>
          </div>
          <p className="summary-note">
            {t(
              "Guest receipts stay available in the browser used to place the order.",
            )}
          </p>
        </div>
      </div>
    );
  const orders = result?.customerId === customer.id ? result.orders : null;
  const isPast = (order: Order) =>
    ["Completed", "Cancelled"].includes(order.status);
  const shownOrders = orders?.filter(
    (order) =>
      filter === "all" || (filter === "past" ? isPast(order) : !isPast(order)),
  );
  const guidance: Record<Order["status"], string> = {
    "Awaiting shop confirmation":
      "The shop will review your order and confirm pickup details.",
    Confirmed:
      "Your order is confirmed. We’ll update its status when it is ready.",
    "Ready for pickup":
      "Ready to collect. Bring your order reference to the shop.",
    Completed: "Pickup complete. Your receipt is saved with this order.",
    Cancelled: "This order is closed. Contact the shop if you have a question.",
  };
  return (
    <div className="container account-page">
      <div className="my-orders-heading">
        <div>
          <span className="eyebrow">{t("Your shop account")}</span>
          <h1>{t("My orders.")}</h1>
          <p>
            {t(
              "Follow your pickup orders and view their details. Updates refresh automatically.",
            )}
          </p>
        </div>
        <button
          className="button white"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={18} />
          {busy ? t("Refreshing…") : t("Refresh orders")}
        </button>
      </div>
      {updatedAt && (
        <p className="summary-note">
          {t("Last refreshed: ")}
          {new Date(updatedAt).toLocaleTimeString(
            currentLanguage() === "ne" ? "ne-NP" : "en-GB",
            { timeZone: "Asia/Kathmandu" },
          )}
        </p>
      )}
      <Link className="text-link" to="/account">
        {t("Your profile")}
        <ArrowRight size={16} />
      </Link>
      {!!orders?.length && (
        <div className="order-filter-bar" aria-label={t("Filter your orders")}>
          {(
            [
              ["all", "All orders"],
              ["active", "Active"],
              ["past", "Past orders"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(label)}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="field-error" role="alert">
          {t(error)}
        </p>
      )}
      {!orders && !error && <p role="status">{t("Loading your orders…")}</p>}
      {orders && !shownOrders?.length && (
        <div className="empty-state shop-empty-state">
          <span className="shop-empty-icon">
            <Package size={36} aria-hidden="true" />
          </span>
          <h2>
            {!orders.length
              ? t("No orders yet.")
              : filter === "active"
                ? t("You’re all caught up.")
                : t("No past orders yet.")}
          </h2>
          <p>
            {!orders.length
              ? t(
                  "Place an order while signed in and follow its pickup progress here.",
                )
              : filter === "active"
                ? t(
                    "Your completed and cancelled orders are saved under Past orders.",
                  )
                : t("Completed and cancelled orders will appear here.")}
          </p>
          <div className="shop-empty-actions">
            <Link className="button dark" to="/mobiles">
              {t("Explore phones")}
              <ArrowRight size={18} />
            </Link>
            {orders.length > 0 ? (
              <button className="button white" onClick={() => setFilter("all")}>
                {t("View all orders")}
              </button>
            ) : (
              <Link className="button white" to="/accessories">
                {t("Browse accessories")}
              </Link>
            )}
          </div>
        </div>
      )}
      <div className="customer-orders">
        {shownOrders?.map((order) => (
          <article className="customer-order" key={order.id}>
            <div className="customer-order-top">
              <div>
                <h2>{order.id}</h2>
                <p>
                  {new Date(order.date).toLocaleDateString(
                    currentLanguage() === "ne" ? "ne-NP" : "en-GB",
                    {
                      timeZone: "Asia/Kathmandu",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>
              <span
                className={`order-status ${order.status === "Cancelled" ? "cancelled" : order.status === "Completed" ? "completed" : order.status === "Ready for pickup" ? "ready" : order.status === "Confirmed" ? "confirmed" : "pending"}`}
              >
                {t(order.status)}
              </span>
            </div>
            <p className="customer-order-guidance">
              {t(guidance[order.status])}
            </p>
            <ul>
              {order.items.map(({ product, quantity }) => (
                <li key={product.id}>
                  {product.name}
                  <span> × {quantity}</span>
                </li>
              ))}
            </ul>
            <div className="customer-order-bottom">
              <div>
                <strong>{money(order.total)}</strong>
                <p>{t("Shop pickup")}</p>
                <a
                  className="text-link"
                  href={shopDirections}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Directions to the shop")}
                </a>
              </div>
              <Link className="button dark" to={`/order/${order.id}`}>
                {t("View order")}
                <ArrowRight size={18} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
