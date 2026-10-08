import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Minus,
  Plus,
  ShoppingBag,
  MapPin,
  Info,
} from "lucide-react";
import { useProducts } from "../context/ProductContext";
import { money, shop, whatsapp } from "../data/shop";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";
import ProductGallery from "../components/ProductGallery";
import WhatsAppIcon from "../components/WhatsAppIcon";
import NotFound from "./NotFound";
import { isSampleProduct, purchaseLimit } from "../utils/products";
export default function Product() {
  const { products } = useProducts();
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const { add } = useCart();
  const navigate = useNavigate();
  useEffect(() => setQuantity(1), [slug]);
  if (!product) return <NotFound />;
  const maximum = purchaseLimit(product);
  const selectedQuantity = Math.min(quantity, Math.max(1, maximum));
  return (
    <div className="container product-page">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <ArrowRight size={12} />
        <Link
          to={
            product.category === "new"
              ? "/mobiles"
              : product.category === "used"
                ? "/second-hand"
                : "/accessories"
          }
        >
          {product.category === "new"
            ? "New mobiles"
            : product.category === "used"
              ? "Second-hand sets"
              : "Accessories"}
        </Link>
        <ArrowRight size={12} />
        <span>{product.name}</span>
      </div>
      <div className="product-detail">
        <ProductGallery key={product.id} product={product} />
        <div className="detail-copy">
          <span className="eyebrow">
            {product.category === "used" ? "Second-hand set" : product.brand}
          </span>
          <h1>{product.name}</h1>
          <div
            className={`availability ${product.available ? "" : "unavailable"}`}
          >
            {isSampleProduct(product) ? "Sample · " : ""}
            {product.available
              ? `In stock · ${product.stockQuantity} available · Shop pickup`
              : "Currently out of stock"}
          </div>
          <div className="detail-price">{money(product.price)}</div>
          <p>{product.description}</p>
          {product.category === "used" && (
            <div className="condition-grid">
              <div>
                <span>Condition</span>
                <strong>{product.condition}</strong>
              </div>
              <div>
                <span>Battery health</span>
                <strong>{product.battery}%</strong>
              </div>
              <div>
                <span>Storage</span>
                <strong>{product.storage} GB</strong>
              </div>
              <div>
                <span>Warranty</span>
                <strong>Confirm with shop</strong>
              </div>
            </div>
          )}
          {isSampleProduct(product) && (
            <div className="sample-note">
              <Info size={17} />
              <span>
                Sample price and details. Availability, condition, and warranty
                require shop confirmation.
              </span>
            </div>
          )}
          <label className="quantity-label">Quantity</label>
          <div className="purchase-row">
            <div className="quantity">
              <button
                aria-label="Decrease quantity"
                disabled={selectedQuantity === 1 || !maximum}
                onClick={() => setQuantity(selectedQuantity - 1)}
              >
                <Minus size={16} />
              </button>
              <span aria-live="polite">{selectedQuantity}</span>
              <button
                aria-label="Increase quantity"
                disabled={selectedQuantity >= maximum}
                onClick={() => setQuantity(selectedQuantity + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="button dark"
              disabled={!product.available}
              onClick={() => add(product.id, selectedQuantity)}
            >
              <ShoppingBag size={17} />
              Add to bag
            </button>
          </div>
          <div className="button-row detail-actions">
            <button
              className="button teal"
              disabled={!product.available}
              onClick={() => {
                add(product.id, selectedQuantity);
                navigate("/checkout");
              }}
            >
              Buy now <ArrowRight size={16} />
            </button>
            <a
              className="whatsapp-icon-button"
              aria-label={`Ask about ${product.name} on WhatsApp`}
              href={whatsapp(
                `Hello ${shop.name}, I would like to enquire about ${product.brand} ${product.name}${product.category === "used" ? " (second-hand)" : ""}. Please confirm its price and availability.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
            </a>
          </div>
          <div className="pickup-note">
            <MapPin size={17} />
            Shop pickup in Lekhnath · Open {shop.hours}
          </div>
        </div>
      </div>
      <section className="specifications">
        <h2>The details, at a glance.</h2>
        <dl>
          {Object.entries(product.specs).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt>Product type</dt>
            <dd>
              {product.category === "new"
                ? "New mobile"
                : product.category === "used"
                  ? "Second-hand mobile"
                  : "Accessory"}
            </dd>
          </div>
          <div>
            <dt>Collection</dt>
            <dd>Shop pickup only</dd>
          </div>
        </dl>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>You might also like.</h2>
            <p>A few more options to explore.</p>
          </div>
          <Link
            to={
              product.category === "new"
                ? "/mobiles"
                : product.category === "used"
                  ? "/second-hand"
                  : "/accessories"
            }
          >
            See collection <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="product-grid">
          {products
            .filter(
              (p) => p.category === product.category && p.id !== product.id,
            )
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    </div>
  );
}
