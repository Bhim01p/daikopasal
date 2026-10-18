import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { money } from "../data/shop";
import { currentLanguage, useT } from "../context/LanguageContext";
import type { Product } from "../types";
import { productImageSource } from "../utils/products";
import SafeImage from "./SafeImage";

interface Bill {
  id: string;
  orderId: string | null;
  customerName: string;
  lines: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  issuedAt: string;
}
export default function AdminBilling({ products, onStockChanged }: {
  products: Product[];
  onStockChanged: () => Promise<void>;
}) {
  const t = useT();
  const [bills, setBills] = useState<Bill[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const load = async () => setBills((await api<{ bills: Bill[] }>("/admin/bills")).bills);
  useEffect(() => { void load().catch((error) => setError(error.message)); }, []);
  const selected = products.filter((product) => quantities[product.id] > 0);
  const total = selected.reduce((sum, product) => sum + product.price * quantities[product.id], 0);
  const availableProducts = useMemo(() => products.filter((product) => product.stockQuantity !== null && product.stockQuantity > 0 && !product.priceIsEstimate && (category === "all" || product.category === category) && `${product.brand} ${product.name}`.toLowerCase().includes(query.toLowerCase())), [products, category, query]);
  const adjust = (product: Product, delta: number) => setQuantities((current) => ({ ...current, [product.id]: Math.max(0, Math.min(product.stockQuantity || 0, (current[product.id] || 0) + delta)) }));
  async function issue() {
    setBusy(true); setError("");
    try {
      const input = {
        customerName, customerPhone, requestId, language: currentLanguage(),
        items: selected.map((product) => ({ productId: product.id, quantity: quantities[product.id] })),
      };
      const { bill } = await api<{ bill: Bill }>("/admin/bills", { method: "POST", body: JSON.stringify(input) });
      await load();
      await onStockChanged();
      setQuantities({}); setCustomerName(""); setCustomerPhone("");
      setRequestId(crypto.randomUUID());
      const link = document.createElement("a"); link.href = `/api/admin/bills/${encodeURIComponent(bill.id)}/pdf`; link.target = "_blank"; link.rel = "noopener"; link.click();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not issue bill."); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel billing-panel">
    <div className="billing-heading"><div><h2>{t("Billing")}</h2><p>{t("Create a bill for an in-store purchase.")}</p><p className="billing-mode-note">{t("Print a shop receipt. Tax details are pending; this is not a tax invoice.")}</p></div></div>
    <div className="billing-workspace">
      <div className="billing-main-column">
        <fieldset className="billing-card"><legend>{t("Customer information")}</legend><div className="billing-customer-fields"><label>{t("Customer name")}<input value={customerName} maxLength={100} onChange={(event) => setCustomerName(event.target.value)} /></label><label>{t("Phone (optional)")}<input value={customerPhone} maxLength={20} onChange={(event) => setCustomerPhone(event.target.value)} /></label><button type="button" className="button white" onClick={() => { setCustomerName(""); setCustomerPhone(""); }}>{t("Clear")}</button></div></fieldset>
        <fieldset className="billing-card"><legend>{t("Add products")}</legend><div className="billing-toolbar"><input aria-label={t("Search products")} placeholder={t("Search products…")} value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label={t("Category")} value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{t("All categories")}</option><option value="new">{t("New phones")}</option><option value="used">{t("Used phones")}</option><option value="accessory">{t("Accessories")}</option></select></div><div className="billing-product-list">{availableProducts.map((product) => { const quantity = quantities[product.id] || 0; return <article className="billing-product-row" key={product.id}><SafeImage src={productImageSource(product)} alt={product.name} /><div className="billing-product-info"><strong>{product.name}</strong><span>{product.brand} · {money(product.price)}</span><small>{product.stockQuantity} {t("available")}</small></div><div className="billing-row-actions"><div className="billing-quantity"><button type="button" aria-label={t("Decrease quantity")} onClick={() => adjust(product, -1)} disabled={!quantity}>−</button><span>{quantity}</span><button type="button" aria-label={t("Increase quantity")} onClick={() => adjust(product, 1)} disabled={quantity >= (product.stockQuantity || 0)}>+</button></div><button type="button" className="button dark billing-add" onClick={() => adjust(product, 1)} disabled={quantity >= (product.stockQuantity || 0)}>{t("Add")}</button></div></article>})}{!availableProducts.length && <p className="admin-empty">{t("No products match or no products are available.")}</p>}</div></fieldset>
      </div>
      <aside className="billing-current-card"><div className="billing-card-heading"><h3>{t("Current bill")}</h3><button type="button" className="button white" onClick={() => setQuantities({})} disabled={!selected.length}>{t("Clear all")}</button></div>{selected.length ? <div className="billing-selected-list">{selected.map((product) => <article key={product.id}><SafeImage src={productImageSource(product)} alt="" /><div><strong>{product.name}</strong><span>{money(product.price)}</span><div className="billing-quantity"><button type="button" aria-label={t("Decrease quantity")} onClick={() => adjust(product, -1)}>−</button><span>{quantities[product.id]}</span><button type="button" aria-label={t("Increase quantity")} onClick={() => adjust(product, 1)} disabled={quantities[product.id] >= (product.stockQuantity || 0)}>+</button></div></div><button type="button" className="billing-remove" aria-label={t("Remove product")} onClick={() => adjust(product, -quantities[product.id])}>×</button></article>)}</div> : <div className="billing-empty"><strong>{t("No products added yet.")}</strong><span>{t("Choose products from the list to create a bill.")}</span></div>}<div className="billing-totals"><span>{t("Subtotal")} ({selected.reduce((sum, product) => sum + quantities[product.id], 0)} {t("items")})<b>{money(total)}</b></span><strong>{t("Total")}<b>{money(total)}</b></strong></div><button className="button dark billing-issue" disabled={busy || !selected.length || !customerName.trim()} onClick={() => void issue()}>{busy ? t("Saving…") : t("Issue and print bill")}</button></aside>
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="billing-issued"><h3>{t("Issued bills")}</h3><div className="billing-list">{bills.map((bill) => <article key={bill.id}><strong>{bill.id}</strong><span>{bill.customerName}</span><span>{new Date(bill.issuedAt).toLocaleString(currentLanguage() === "ne" ? "ne-NP" : "en-GB")}</span><span>{bill.lines.length} {t("items")}</span><b>{money(bill.total)}</b><a className="button white" href={`/api/admin/bills/${encodeURIComponent(bill.id)}/pdf`} target="_blank" rel="noreferrer">{t("Open PDF")}</a></article>)}</div></section>
  </section>;
}
