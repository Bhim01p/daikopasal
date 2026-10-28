import SafeImage from "../components/SafeImage";
import { useT } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import { money } from "../data/shop";
import {
  isSampleProduct,
  productImageSource,
  purchaseLimit,
} from "../utils/products";
export function EmptyBag() {
  const t = useT();
  return (
    <div className="empty-state shop-empty-state">
      <span className="shop-empty-icon">
        <ShoppingBag size={36} aria-hidden="true" />
      </span>
      <h2>{t("Your cart is waiting.")}</h2>
      <p>
        {t(
          "Choose a phone or accessory to get started. Your cart stays saved while you browse.",
        )}
      </p>
      <div className="shop-empty-actions">
        <Link className="button dark" to="/mobiles">
          {t("Explore mobiles ")}
          <ArrowRight size={17} />
        </Link>
        <Link className="button white" to="/accessories">
          {t("Browse accessories")}
        </Link>
      </div>
    </div>
  );
}
export default function Cart() {
  const t = useT();
  const { products } = useProducts();
  const { items, count, total, setQuantity } = useCart();
  return (
    <div className="container standard-page">
      <span className="eyebrow">{t("A little closer to your upgrade")}</span>
      <h1>{t("Your shopping cart.")}</h1>
      {items.length ? (
        <div className="cart-layout">
          <div className="cart-items">
            <p className="muted">
              {count} {count === 1 ? t("item") : t("items")}
            </p>
            {items.map((item) => {
              const p = products.find((p) => p.id === item.productId)!;
              if (!p) return null;
              return (
                <article className="cart-item" key={p.id}>
                  <Link to={`/product/${p.slug}`} className="cart-image">
                    <SafeImage src={productImageSource(p)} alt={p.name} />
                  </Link>
                  <div className="cart-item-copy">
                    <span className="overline">
                      {p.category === "used" ? t("Second-hand") : p.brand}
                    </span>
                    <Link to={`/product/${p.slug}`}>
                      <h2>{p.name}</h2>
                    </Link>
                    <div className="quantity small">
                      <button
                        aria-label={t("Decrease {{v0}} quantity", {
                          v0: String(p.name),
                        })}
                        onClick={() => setQuantity(p.id, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={t("Increase {{v0}} quantity", {
                          v0: String(p.name),
                        })}
                        disabled={item.quantity >= purchaseLimit(p)}
                        onClick={() => setQuantity(p.id, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-end">
                    <strong>{money(p.price * item.quantity)}</strong>
                    <button
                      className="remove-button"
                      onClick={() => setQuantity(p.id, 0)}
                      aria-label={t("Remove {{v0}}", { v0: String(p.name) })}
                    >
                      <Trash2 size={15} />
                      {t("Remove")}
                    </button>
                  </div>
                </article>
              );
            })}
            <Link className="text-link" to="/mobiles">
              {t("Keep exploring ")}
              <ArrowRight size={16} />
            </Link>
          </div>
          <aside className="order-summary">
            <h2>{t("Your order summary")}</h2>
            <div className="summary-line">
              <span>
                {t("Subtotal (")}
                {count} {t(" items)")}
              </span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-line total">
              <strong>{t("Total")}</strong>
              <strong>{money(total)}</strong>
            </div>
            <p className="summary-note">
              {items.some((item) =>
                products.some(
                  (p) =>
                    p.id === item.productId &&
                    (p.priceIsEstimate || isSampleProduct(p)),
                ),
              )
                ? t("Includes estimated prices. ")
                : ""}
              {t("The shop will confirm your pickup before you visit.")}
            </p>
            <Link className="button dark full" to="/checkout">
              {t("Continue to checkout ")}
              <ArrowRight size={17} />
            </Link>
          </aside>
        </div>
      ) : (
        <EmptyBag />
      )}
    </div>
  );
}
