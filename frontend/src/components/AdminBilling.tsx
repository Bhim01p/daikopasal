import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { money } from "../data/shop";
import { currentLanguage, useT } from "../context/LanguageContext";
import type { Order, Product } from "../types";

interface Bill {
  id: string;
  orderId: string | null;
  customerName: string;
  lines: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  issuedAt: string;
}
export default function AdminBilling({ products, orders, onStockChanged }: {
  products: Product[];
  orders: Order[];
  onStockChanged: () => Promise<void>;
}) {
  const t = useT();
  const [bills, setBills] = useState<Bill[]>([]);
  const [mode, setMode] = useState<"order" | "walkin">("order");
  const [orderId, setOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => setBills((await api<{ bills: Bill[] }>("/admin/bills")).bills);
  useEffect(() => { void load().catch((error) => setError(error.message)); }, []);
  const billed = new Set(bills.map((bill) => bill.orderId));
  const eligible = orders.filter((order) => order.status === "Completed" && !billed.has(order.id));
  const selected = products.filter((product) => quantities[product.id] > 0);
  const total = selected.reduce((sum, product) => sum + product.price * quantities[product.id], 0);
  async function issue() {
    setBusy(true); setError("");
    try {
      const input = mode === "order" ? { orderId } : {
        customerName, customerPhone, requestId, language: currentLanguage(),
        items: selected.map((product) => ({ productId: product.id, quantity: quantities[product.id] })),
      };
      const { bill } = await api<{ bill: Bill }>("/admin/bills", { method: "POST", body: JSON.stringify(input) });
      await load();
      await onStockChanged();
      setOrderId(""); setQuantities({}); setCustomerName(""); setCustomerPhone("");
      setRequestId(crypto.randomUUID());
      const link = document.createElement("a"); link.href = `/api/admin/bills/${encodeURIComponent(bill.id)}/pdf`; link.target = "_blank"; link.rel = "noopener"; link.click();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not issue bill."); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel billing-panel">
    <h2>{t("Billing")}</h2>
    <p>{t("Print a narrow shop receipt. Tax details are pending; this is not a tax invoice.")}</p>
    <div className="button-row">
      <button className="button white" aria-pressed={mode === "order"} onClick={() => setMode("order")}>{t("Website order")}</button>
      <button className="button white" aria-pressed={mode === "walkin"} onClick={() => setMode("walkin")}>{t("Walk-in sale")}</button>
    </div>
    {mode === "order" ? <label>{t("Completed order")}
      <select value={orderId} onChange={(event) => setOrderId(event.target.value)}>
        <option value="">{t("Select an order")}</option>
        {eligible.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.name} · {money(order.total)}</option>)}
      </select>
    </label> : <>
      <div className="admin-form-row">
        <label>{t("Customer name")}<input value={customerName} maxLength={100} onChange={(event) => setCustomerName(event.target.value)} /></label>
        <label>{t("Phone (optional)")}<input value={customerPhone} maxLength={20} onChange={(event) => setCustomerPhone(event.target.value)} /></label>
      </div>
      <div className="billing-products">
        {products.filter((product) => product.stockQuantity !== null && product.stockQuantity > 0 && !product.priceIsEstimate).map((product) => <label key={product.id}>
          <span>{product.name} · {money(product.price)} · {product.stockQuantity} {t("available")}</span>
          <input type="number" min={0} max={product.stockQuantity || 0} value={quantities[product.id] || 0}
            onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.valueAsNumber || 0 }))} />
        </label>)}
        {!products.some((product) => product.stockQuantity !== null && product.stockQuantity > 0 && !product.priceIsEstimate) && <p>{t("Confirm a product price in inventory before making a walk-in bill.")}</p>}
      </div>
      <strong>{t("Total")}: {money(total)}</strong>
    </>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div><button className="button dark" disabled={busy || (mode === "order" ? !orderId : !selected.length || !customerName.trim())} onClick={() => void issue()}>{busy ? t("Saving…") : t("Issue and print bill")}</button></div>
    <h3>{t("Issued bills")}</h3>
    <div className="billing-list">
      {bills.map((bill) => <article key={bill.id}>
        <strong>{bill.id}</strong><span>{bill.customerName}</span><span>{money(bill.total)}</span>
        <a className="button white" href={`/api/admin/bills/${encodeURIComponent(bill.id)}/pdf`} target="_blank" rel="noreferrer">{t("Open PDF")}</a>
      </article>)}
    </div>
  </section>;
}
