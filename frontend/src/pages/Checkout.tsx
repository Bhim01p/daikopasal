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
import { money, shop, whatsapp } from "../data/shop";
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
      !/^(?:\+977|977)?9[78]\d{8}$/.test(details.phone.replace(/[\s()-]/g, ""))
    )
      next.phone = "Enter a valid Nepal mobile number, such as 9806600444.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const order = await createOrder({
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
      <span className="eyebrow">Collect your next upgrade</span>
      <h1>
        {customer?.profileComplete
          ? "Review your pickup order."
          : "Let’s get your details."}
      </h1>
      {!items.length ? (
        <EmptyBag />
      ) : (
        <div className="cart-layout">
          <form className="checkout-form" onSubmit={submit} noValidate>
            <h2>Customer details</h2>
            {customer ? (
              <div className="saved-customer">
                {customer.profileComplete ? (
                  <>
                    <strong>{customer.name}</strong>
                    <p>{customer.phone}</p>
                    <p>{customer.email}</p>
                    <p className="summary-note">
                      Using your saved profile details.
                    </p>
                  </>
                ) : (
                  <p>Complete your name and email before placing your order.</p>
                )}
                <Link className="text-link" to="/account?next=/checkout">
                  {customer.profileComplete
                    ? "Edit saved details"
                    : "Complete your profile"}
                </Link>
              </div>
            ) : (
              <>
                <p>
                  <Link className="text-link" to="/login?next=/checkout">
                    Log in to use saved details
                  </Link>{" "}
                  or continue as a guest.
                </p>
                <p>
                  We’ll save these details with your pickup order for the shop.
                </p>
                <label htmlFor="customer-name">
                  Full name <span>*</span>
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
                  Phone number <span>*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98XXXXXXXX"
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
                  Email address <span>*</span>
                </label>
                <input
                  id="customer-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : "email-help"}
                  required
                />
                <p id="email-help" className="summary-note">
                  Use the email address where you want to receive order and
                  pickup updates.
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
                <strong>Shop pickup only</strong>
                <p>
                  {shop.location}
                  <br />
                  Open {shop.hours}. Confirm a pickup time with the shop.
                  <br />
                  No delivery address is needed.
                </p>
              </div>
            </div>
            <label htmlFor="order-note">
              Order note <span className="optional">(optional)</span>
            </label>
            <textarea
              id="order-note"
              rows={4}
              maxLength={1000}
              placeholder="A preferred pickup time or a question about your order…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="payment-panel">
              <strong>Payment confirmed with the shop</strong>
              <p>
                Arrange payment at pickup. There is no online payment on this
                prototype.
              </p>
            </div>
            <p className="privacy-note">
              Your order details are saved on the shop’s local server. You can
              also send the summary through WhatsApp for pickup confirmation.
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
              {saving ? "Saving…" : "Create pickup order"}
              <ArrowRight size={17} />
            </button>
          </form>
          <aside className="order-summary">
            <h2>Your order</h2>
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
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-line">
              <span>Collection</span>
              <span>Shop pickup</span>
            </div>
            <div className="summary-line total">
              <strong>
                {items.some((item) =>
                  products.some(
                    (p) => p.id === item.productId && isSampleProduct(p),
                  ),
                )
                  ? "Sample total"
                  : "Total"}
              </strong>
              <strong>{money(total)}</strong>
            </div>
            <p className="summary-note">
              Your order will appear in the shop’s admin area. Prices and pickup
              timing will be confirmed by the shop.
            </p>
            <Link className="text-link" to="/cart">
              Edit your bag
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
export function OrderSuccess({ id }: { id?: string }) {
  const { customer, checking } = useCustomer();
  const location = useLocation();
  const [order, setOrder] = useState<Order | undefined>(() => {
    const receipt = (location.state as { order?: Order } | null)?.order;
    return receipt && !receipt.accountOrder && receipt.id === id
      ? receipt
      : readOrders().find((o) => o.id === id && !o.accountOrder);
  });
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptError, setReceiptError] = useState("");
  const token = order?.receiptToken;
  useEffect(() => {
    if (!id || checking) return;
    let active = true;
    api<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, {
      headers: token ? { "X-Order-Token": token } : {},
    })
      .then((result) => {
        if (active) {
          setOrder(result.order);
          saveOrder(result.order);
        }
      })
      .catch((error) => {
        if (active && (!token || error.status === 404)) setOrder(undefined);
        else if (active)
          setReceiptError(
            "Your saved receipt is shown. We could not refresh its latest status.",
          );
      })
      .finally(() => {
        if (active) setReceiptLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, token, customer?.id, checking]);
  const [copied, setCopied] = useState(false);
  if (checking || receiptLoading)
    return (
      <div className="container empty-state" role="status">
        Opening your order…
      </div>
    );
  if (!order)
    return (
      <div className="container standard-page empty-state">
        <h1>Let’s find your order.</h1>
        <p>
          For an account order, log in with the number used to place it. For a
          guest order, use the original browser or contact the shop with your
          reference.
        </p>
        <Link className="button dark" to="/cart">
          Go to your bag
        </Link>
        {!customer && (
          <Link
            className="button white"
            to={`/login?next=${encodeURIComponent(`/order/${id}`)}`}
          >
            Log in to view order
          </Link>
        )}
      </div>
    );
  return (
    <div className="container success-page">
      <div className="success-icon">
        <Check size={36} />
      </div>
      <span className="eyebrow">Your pickup order</span>
      <h1>
        {order.status === "Completed"
          ? "Your pickup is complete."
          : order.status === "Cancelled"
            ? "Your order has been cancelled."
            : "Your order has been received."}
      </h1>
      <p>
        Thank you, {order.name}. Your order has been received by the shop
        system.
        <br />
        <strong>
          {order.status === "Completed"
            ? "Thank you for shopping with us. Keep this receipt for your records."
            : order.status === "Cancelled"
              ? "This order is closed. Contact the shop if you have a question."
              : order.status === "Ready for pickup"
                ? `Your order is ready. Bring your order reference when collecting it. Open ${shop.hours}.`
                : order.status === "Confirmed"
                  ? "The shop has confirmed your order. Contact us to arrange pickup timing."
                  : "Contact the shop to confirm availability and pickup timing."}
        </strong>
      </p>
      <div className="reference">
        {order.id}
        <span>{order.status}</span>
      </div>
      {order.history && (
        <ol className="order-history" aria-label="Order progress">
          {order.history.map((event, index) => (
            <li key={index}>
              <strong>{event.status}</strong>
              <time dateTime={event.date}>
                {new Date(event.date).toLocaleString("en-GB", {
                  timeZone: "Asia/Kathmandu",
                })}
              </time>
            </li>
          ))}
        </ol>
      )}
      {order.email && (
        <p className="summary-note">
          Email for order updates: <strong>{order.email}</strong>.
        </p>
      )}
      {receiptError && (
        <p role="status" className="summary-note">
          {receiptError}
        </p>
      )}
      <div className="success-summary">
        <div className="summary-line">
          <span>Created</span>
          <span>
            {new Date(order.date).toLocaleDateString("en-GB", {
              timeZone: "Asia/Kathmandu",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
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
            {order.items.some((item) => isSampleProduct(item.product))
              ? "Sample total"
              : "Total"}
          </strong>
          <strong>{money(order.total)}</strong>
        </div>
        <div className="pickup-note">
          <MapPin size={17} />
          Shop pickup · {shop.location}
        </div>
      </div>
      <a
        className="button teal full"
        href={whatsapp(orderMessage(order))}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={20} />
        Contact shop about this order
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
        {copied ? "Order summary copied" : "Copy order summary"}
      </button>
      <p className="summary-note">
        Shop pickup only. Keep your order reference when contacting the shop.
      </p>
      <Link className="text-link" to="/mobiles">
        Continue exploring <ArrowRight size={16} />
      </Link>
      {order.accountOrder && (
        <Link className="button white full" to="/my-orders">
          Back to My orders
        </Link>
      )}
    </div>
  );
}
