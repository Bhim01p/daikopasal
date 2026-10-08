import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import { money } from "../data/shop";
import {
  isSampleProduct,
  productImageSource,
  purchaseLimit,
} from "../utils/products";
export function EmptyBag() {
  return (
    <div className="empty-state shop-empty-state">
      <span className="shop-empty-icon">
        <ShoppingBag size={36} aria-hidden="true" />
      </span>
      <h2>Your bag is waiting.</h2>
      <p>
        Choose a phone or accessory to get started. Your bag stays saved while
        you browse.
      </p>
      <div className="shop-empty-actions">
        <Link className="button dark" to="/mobiles">
          Explore mobiles <ArrowRight size={17} />
        </Link>
        <Link className="button white" to="/accessories">
          Browse accessories
        </Link>
      </div>
    </div>
  );
}
export default function Cart() {
  const { products } = useProducts();
  const { items, count, total, setQuantity } = useCart();
  return (
    <div className="container standard-page">
      <span className="eyebrow">A little closer to your upgrade</span>
      <h1>Your shopping bag.</h1>
      {items.length ? (
        <div className="cart-layout">
          <div className="cart-items">
            <p className="muted">
              {count} {count === 1 ? "item" : "items"} · Shop pickup
            </p>
            {items.map((item) => {
              const p = products.find((p) => p.id === item.productId)!;
              if (!p) return null;
              return (
                <article className="cart-item" key={p.id}>
                  <Link to={`/product/${p.slug}`} className="cart-image">
                    <img src={productImageSource(p)} alt={p.name} />
                  </Link>
                  <div className="cart-item-copy">
                    <span className="overline">
                      {p.category === "used" ? "Second-hand" : p.brand}
                    </span>
                    <Link to={`/product/${p.slug}`}>
                      <h2>{p.name}</h2>
                    </Link>
                    <p>{money(p.price)} each</p>
                    <div className="quantity small">
                      <button
                        aria-label={`Decrease ${p.name} quantity`}
                        onClick={() => setQuantity(p.id, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`Increase ${p.name} quantity`}
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
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
            <Link className="text-link" to="/mobiles">
              Keep exploring <ArrowRight size={16} />
            </Link>
          </div>
          <aside className="order-summary">
            <h2>Your order summary</h2>
            <div className="summary-line">
              <span>Subtotal ({count} items)</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-line">
              <span>Collection</span>
              <span>Shop pickup</span>
            </div>
            <div className="summary-line total">
              <strong>Total</strong>
              <strong>{money(total)}</strong>
            </div>
            <p className="summary-note">
              {items.some((item) =>
                products.some(
                  (p) => p.id === item.productId && isSampleProduct(p),
                ),
              )
                ? "Includes sample prices. "
                : ""}
              The shop will confirm your pickup before you visit.
            </p>
            <Link className="button dark full" to="/checkout">
              Continue to checkout <ArrowRight size={17} />
            </Link>
            <div className="pickup-note">
              <MapPin size={16} />
              No delivery · Collect in Lekhnath
            </div>
          </aside>
        </div>
      ) : (
        <EmptyBag />
      )}
    </div>
  );
}
