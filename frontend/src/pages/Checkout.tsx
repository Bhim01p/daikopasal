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
  Store,
  Truck,
  WalletCards,
  QrCode,
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

const provinceDistricts: Record<string, string[]> = {
  "Koshi Province": ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"],
  "Madhesh Province": ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"],
  "Bagmati Province": ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"],
  "Gandaki Province": ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun"],
  "Lumbini Province": ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Palpa", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi"],
  "Karnali Province": ["Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu", "Rukum West", "Salyan", "Surkhet"],
  "Sudurpashchim Province": ["Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"],
};
const districtCities: Record<string, string[]> = {
  Kaski: ["Pokhara", "Lekhnath"], Kathmandu: ["Kathmandu"], Lalitpur: ["Lalitpur"], Bhaktapur: ["Bhaktapur"], Chitwan: ["Bharatpur"], Rupandehi: ["Butwal", "Bhairahawa"], Morang: ["Biratnagar"], Jhapa: ["Bhadrapur", "Damak"], Sunsari: ["Dharan", "Itahari"], Banke: ["Nepalgunj"], Kanchanpur: ["Mahendranagar"], Kailali: ["Dhangadhi"], Dang: ["Ghorahi", "Tulsipur"], Makwanpur: ["Hetauda"], Syangja: ["Putalibazar"], Tanahun: ["Damauli"], Baglung: ["Baglung"], Gorkha: ["Gorkha"], Lamjung: ["Besisahar"], Nawalpur: ["Kawasoti"], Parbat: ["Kusma"], Myagdi: ["Beni"], Palpa: ["Tansen"], Kapilvastu: ["Taulihawa"], Surkhet: ["Birendranagar"], Salyan: ["Salyan"], Dhanusha: ["Janakpur"], Parsa: ["Birgunj"], Bara: ["Kalaiya"], Saptari: ["Rajbiraj"], Siraha: ["Siraha"],
};
function CheckoutSteps({ active }: { active: "cart" | "checkout" | "payment" | "tracking" }) {
  const steps = ["cart", "checkout", "payment", "tracking"] as const;
  const labels = { cart: "Cart", checkout: "Delivery & payment", payment: "Payment", tracking: "Tracking" };
  return <nav className="checkout-stepper" aria-label="Checkout progress">{steps.map((step, index) => <span key={step} className={steps.indexOf(active) >= index ? "active" : ""}><b>{index + 1}</b>{labels[step]}</span>)}</nav>;
}
export default function Checkout() {
  const t = useT();
  const { language } = useLanguage();
  const { customer, checking, setCustomer } = useCustomer();
  const { products, refresh } = useProducts();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const checkoutLocation = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"PAY_AT_SHOP" | "MANUAL_QR">("PAY_AT_SHOP");
  const [deliveryAddress, setDeliveryAddress] = useState({ province: "", district: "", city: "", area: "", address: "", landmark: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(() => checkoutLocation.pathname.endsWith("/review"));
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
    if (fulfillmentMethod === "DELIVERY") {
      for (const key of ["province", "district", "city", "area", "address"] as const)
        if (!deliveryAddress[key].trim()) next[key] = "Required for delivery.";
      if (Object.keys(next).length) { setErrors(next); return; }
    }
    if (!reviewing) {
      setReviewing(true);
      navigate("/checkout/review");
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
        fulfillmentMethod,
        paymentMethod,
        deliveryAddress: fulfillmentMethod === "DELIVERY" ? deliveryAddress : undefined,
      });
      saveOrder(order);
      clear();
      navigate(paymentMethod === "MANUAL_QR" ? `/order/${order.id}/payment` : `/order/${order.id}`, { state: { order } });
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
    <div className={`container standard-page order-flow-page${reviewing ? " checkout-review-mode" : ""}`}>
      <span className="eyebrow">{t("Collect your next upgrade")}</span>
      <CheckoutSteps active="checkout" />
      <h1>
        {customer?.profileComplete
          ? t("Review your pickup order.")
          : t("Let’s get your details.")}
      </h1>
      {!items.length ? (
        <EmptyBag />
      ) : (
        <div className="cart-layout">
          {reviewing && <section className="checkout-review-card">
            <button type="button" className="review-back" onClick={() => { setReviewing(false); navigate("/checkout"); }}>← {t("Edit checkout")}</button>
            <h2>{t("Order review")}</h2>
            <div className="review-items">{items.map((i) => { const p = products.find((product) => product.id === i.productId); return p ? <div key={p.id}><span><strong>{p.name}</strong><small>{i.quantity} × {money(p.price)}</small></span><strong>{money(p.price * i.quantity)}</strong></div> : null; })}</div>
            <div className="summary-line"><span>{t("Subtotal")}</span><strong>{money(total)}</strong></div>
            <div className="summary-line"><span>{t("Delivery charge")}</span><strong>{fulfillmentMethod === "DELIVERY" ? money(175) : t("Free")}</strong></div>
            <div className="summary-line total"><strong>{t("Total")}</strong><strong>{money(total + (fulfillmentMethod === "DELIVERY" ? 175 : 0))}</strong></div>
            <div className="review-choice"><strong>{fulfillmentMethod === "DELIVERY" ? t("Home delivery") : t("Shop pickup")}</strong><button type="button" onClick={() => setReviewing(false)}>{t("Change")}</button></div>
            <div className="review-choice"><strong>{paymentMethod === "MANUAL_QR" ? t("Pay via QR") : t("Pay at shop")}</strong><button type="button" onClick={() => setReviewing(false)}>{t("Change")}</button></div>
            <button className="button dark full" type="button" disabled={saving} onClick={() => void submit({ preventDefault() {} } as FormEvent)}>{saving ? t("Placing order…") : t("Place order")} <ArrowRight size={17} /></button>
          </section>}
          <form className="checkout-form" onSubmit={submit} noValidate>
            {(!customer || !customer.profileComplete) && <h2>{t("Customer details")}</h2>}
            {customer ? (
              customer.profileComplete ? null : (
                <div className="saved-customer">
                  <p>
                    {t(
                      "Complete your name and phone number before placing your order.",
                    )}
                  </p>
                  <Link className="text-link" to="/account?edit=1&next=/checkout">
                    {t("Complete your profile")}
                  </Link>
                </div>
              )
            ) : (
              <>
                <p>
                  <Link className="text-link" to="/login?next=/checkout">
                    {t("Log in to use saved details")}
                  </Link>{" "}
                  {t("or continue as a guest.")}
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
                  aria-describedby={errors.email ? "email-error" : undefined}
                  required
                />
                {errors.email && (
                  <p id="email-error" className="field-error">
                    {errors.email}
                  </p>
                )}
              </>
            )}
            <fieldset className="payment-panel">
              <legend>{t("Fulfilment and payment")}</legend>
              <label className={fulfillmentMethod === "PICKUP" ? "selected" : ""}><input type="radio" checked={fulfillmentMethod === "PICKUP"} onChange={() => { setFulfillmentMethod("PICKUP"); setPaymentMethod("PAY_AT_SHOP"); }} /><Store size={22} /><span><strong>{t("Shop pickup")}</strong><small>{t("Pick up from our store in Lekhnath")}</small></span></label>
              <label className={fulfillmentMethod === "DELIVERY" ? "selected" : ""}><input type="radio" checked={fulfillmentMethod === "DELIVERY"} onChange={() => { setFulfillmentMethod("DELIVERY"); setPaymentMethod("MANUAL_QR"); }} /><Truck size={22} /><span><strong>{t("Home delivery")}</strong><small>{t("We’ll deliver to your address")}</small></span></label>
              <label className={paymentMethod === "PAY_AT_SHOP" ? "selected" : ""}><input type="radio" checked={paymentMethod === "PAY_AT_SHOP"} disabled={fulfillmentMethod === "DELIVERY"} onChange={() => setPaymentMethod("PAY_AT_SHOP")} /><WalletCards size={22} /><span><strong>{t("Pay at shop")}</strong><small>{t("Pay when you collect your order")}</small></span></label>
              <label className={paymentMethod === "MANUAL_QR" ? "selected" : ""}><input type="radio" checked={paymentMethod === "MANUAL_QR"} onChange={() => setPaymentMethod("MANUAL_QR")} /><QrCode size={22} /><span><strong>{t("Pay via QR")}</strong><small>{t("Scan QR and pay now")}</small></span></label>
              <label className="coming-soon"><input type="radio" disabled /><span className="esewa-mark">e</span><span><strong>eSewa</strong><small>{t("Pay securely with eSewa")}</small></span><em>{t("Soon")}</em></label>
            </fieldset>
            {fulfillmentMethod === "DELIVERY" && <div className="delivery-fields">
              <label>{t("province")} *<select value={deliveryAddress.province} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, province: e.target.value, district: "", city: "" })}><option value="">{t("Select province")}</option>{Object.keys(provinceDistricts).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>{t("district")} *<select value={deliveryAddress.district} disabled={!deliveryAddress.province} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, district: e.target.value, city: "" })}><option value="">{deliveryAddress.province ? t("Select district") : t("Select province first")}</option>{(provinceDistricts[deliveryAddress.province] || []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>{t("city")} *<select value={deliveryAddress.city} disabled={!deliveryAddress.district} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}><option value="">{deliveryAddress.district ? t("Select city") : t("Select district first")}</option>{(districtCities[deliveryAddress.district] || []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label>{t("area")} *<input autoComplete="address-level3" value={deliveryAddress.area} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, area: e.target.value })} /></label>
              <label>{t("address")} *<input autoComplete="street-address" value={deliveryAddress.address} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, address: e.target.value })} /></label>
              <label>{t("Nearby landmark (optional)")}<input list="delivery-landmark-options" autoComplete="off" value={deliveryAddress.landmark} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, landmark: e.target.value })} /><datalist id="delivery-landmark-options"><option value="Near the shop" /><option value="Near main road" /></datalist></label>
              <label>{t("Delivery notes (optional)")}<textarea value={deliveryAddress.notes} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, notes: e.target.value })} /></label>
            </div>}
            <CancellationPolicy />
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
              {saving ? t("Saving…") : t("Continue to review")}
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
                    <span>{i.quantity} {i.quantity === 1 ? t("item") : t("items")}</span>
                  </div>
                  <strong>{money(p.price * i.quantity)}</strong>
                </div>
              );
            })}
            <div className="summary-line">
              <span>{t("Subtotal")}</span>
              <strong>{money(total)}</strong>
            </div>
            {fulfillmentMethod === "DELIVERY" && <div className="summary-line"><span>{t("Delivery fee")}</span><strong>{money(175)}</strong></div>}
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
              <strong>{money(total + (fulfillmentMethod === "DELIVERY" ? 175 : 0))}</strong>
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
export function OrderSuccess({ id, paymentOnly = false }: { id?: string; paymentOnly?: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const { customer, checking } = useCustomer();
  const location = useLocation();
  const [order, setOrder] = useState<Order | undefined>(() => {
    const receipt = (location.state as { order?: Order } | null)?.order;
    return receipt && receipt.id === id
      ? receipt
      : readOrders().find((o) => o.id === id);
  });
  const [updatedAt, setUpdatedAt] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [receiptError, setReceiptError] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<{qrImage:string;instructions:string;accountName:string} | null>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("me-payment-config") || "null");
      return cached && typeof cached === "object" ? cached : null;
    } catch {
      return null;
    }
  });
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const isManualQr = order?.payment?.method === "MANUAL_QR" || (order?.payment?.method === "ESEWA" && !order.payment.provider);
  const savePaymentQr = async () => {
    if (!paymentConfig?.qrImage) return;
    try {
      const response = await fetch(paymentConfig.qrImage);
      const blob = await response.blob();
      const file = new File([blob], "machhapuchhree-payment-qr.png", { type: blob.type || "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Machhapuchhree payment QR" });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "machhapuchhree-payment-qr.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setPaymentMessage("Could not save the QR image. Please try again.");
    }
  };
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
  useEffect(() => {
    if (!isManualQr) return;
    let active = true;
    setPaymentConfigLoading(true);
    void api<{config:{qrImage:string;instructions:string;accountName:string}}>("/payment-config")
      .then((r) => {
        if (!active) return;
        setPaymentConfig(r.config);
        try { localStorage.setItem("me-payment-config", JSON.stringify(r.config)); } catch { /* cache is optional */ }
      })
      .catch(() => {})
      .finally(() => { if (active) setPaymentConfigLoading(false); });
    return () => { active = false; };
  }, [isManualQr]);
  useEffect(() => { if (paymentOnly && order?.payment?.status === "PAID") navigate(`/order/${order.id}`, { replace: true }); }, [paymentOnly, order?.payment?.status, order?.id, navigate]);
  const [copied, setCopied] = useState(false);
  if ((checking && !order) || (receiptLoading && !order))
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
    <div className={`container success-page order-flow-page${paymentOnly ? " payment-only-page" : ""}`}>
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
      {!paymentOnly && <CheckoutSteps active="tracking" />}
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
      {!paymentOnly && isManualQr && !["PAID", "REJECTED"].includes(order.payment?.status || "") && <Link className="button dark full" to={`/order/${order.id}/payment`}>Complete payment <ArrowRight size={17} /></Link>}
      {!paymentOnly && order.payment?.status === "REJECTED" && <section className="payment-state-card rejected-payment-state">
        <div className="payment-state-icon"><span>×</span></div>
        <h2>{t("Payment rejected")}</h2>
        <p>{t("Your payment could not be verified. You can submit a new payment.")}</p>
        <Link className="button dark full" to={`/order/${order.id}/payment`}>{t("Submit new payment")} <ArrowRight size={17} /></Link>
        <Link className="button white full" to={`/order/${order.id}`}>{t("Back to order")}</Link>
      </section>}
      {!paymentOnly && order.status === "Completed" && <section className="payment-state-card completed-order-state">
        <div className="payment-state-icon"><Check size={30} /></div>
        <h2>{t("Order completed")}</h2>
        <p>{t("Your order has been completed. Thank you for shopping with us!")}</p>
      </section>}
      {paymentOnly && paymentSubmitted && <section className="payment-panel dedicated-payment-step payment-submitted-state">
        <div className="payment-state-icon"><Check size={30} /></div>
        <h1>{t("Payment submitted")}</h1>
        <p>{t("We have received your payment reference and it is under verification.")}</p>
        <div className="payment-reference-card"><span>{t("Order number")}</span><strong>{order.id}</strong><span>{t("Amount")}</span><strong>{money(order.total)}</strong></div>
        <button className="button dark full" onClick={() => navigate(`/order/${order.id}`, { replace: true, state: { order } })}>{t("Go to order tracking")} <ArrowRight size={17} /></button>
      </section>}
      {paymentOnly && !paymentSubmitted && isManualQr && order.payment?.status !== "PAID" && <section className="payment-panel dedicated-payment-step">
        <CheckoutSteps active="payment" />
        <h1>{t("Pay with QR")}</h1><p>{t("Scan the QR using your banking or eSewa app.")}</p>
        {paymentConfigLoading && !paymentConfig?.qrImage && <p className="payment-qr-loading" role="status">{t("Loading payment QR…")}</p>}
        {!paymentConfigLoading && paymentConfig?.qrImage ? <>
          <img className="payment-qr-image" src={paymentConfig.qrImage} alt={t("Shop payment QR")} />
          <button type="button" className="button white payment-qr-download" onClick={savePaymentQr}>{t("Save QR to phone")}</button>
        </> : !paymentConfigLoading && <p className="payment-qr-missing" role="status">{t("The shop payment QR is not available yet. Please contact the shop before paying.")}</p>}
        {paymentConfig?.accountName && <p><strong>{paymentConfig.accountName}</strong></p>}
        {paymentConfig?.instructions && <p>{paymentConfig.instructions}</p>}
        <div className="payment-order-details"><span>{t("Order number")}<strong>{order.id}</strong></span><span>{t("Amount to pay")}<strong>{money(order.total)}</strong></span></div>
        <h3 className="payment-after-heading">{t("After payment")}</h3>
        <ol className="payment-instructions"><li>{t("Pay using the QR.")}</li><li>{t("Enter your transaction/reference ID below.")}</li><li>{t("Tap I Have Paid.")}</li></ol>
        <input value={paymentReference} placeholder={t("Transaction/reference ID")} onChange={(e) => setPaymentReference(e.target.value)} />
        <button className="button dark" disabled={paymentSubmitting || paymentReference.trim().length < 3} onClick={async () => {
          setPaymentSubmitting(true);
          setPaymentMessage("");
          setPaymentSubmitted(false);
          try {
            const result = await api<{order: Order; message: string}>(`/orders/${encodeURIComponent(order.id)}/payment`, { method: "PATCH", headers: token ? { "X-Order-Token": token } : {}, body: JSON.stringify({ reference: paymentReference.trim() }) });
            setOrder(result.order);
            setPaymentMessage(result.message);
            setPaymentSubmitted(true);
          } catch (error) {
            setPaymentMessage(error instanceof Error ? error.message : "Could not submit payment.");
          } finally {
            setPaymentSubmitting(false);
          }
        }}>{paymentSubmitting ? t("Submitting…") : t("I Have Paid")}</button>
        {paymentMessage && <p role="status">{paymentMessage}</p>}
      </section>}
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

