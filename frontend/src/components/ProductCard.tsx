import { Link } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import WhatsAppIcon from "./WhatsAppIcon";
import type { Product } from "../types";
import { money, shop, whatsapp } from "../data/shop";
import { useCart } from "../context/CartContext";
import {
  isIllustration,
  isSampleProduct,
  productImageSource,
} from "../utils/products";
export function ProductImage({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  return (
    <div
      className={`product-visual ${className}`}
      style={{ backgroundColor: product.color + "24" }}
    >
      <img
        src={productImageSource(product)}
        alt={`${product.brand} ${product.name}${isIllustration(product) ? " — illustrative placeholder" : ""}`}
        loading="lazy"
      />
      {isIllustration(product) && (
        <span className="image-caption">Illustrative image</span>
      )}
    </div>
  );
}
export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-image-link">
        <ProductImage product={product} />
        <span
          className={`badge ${product.category === "used" ? "used-badge" : ""}`}
        >
          {product.category === "used"
            ? product.condition
            : product.category === "new"
              ? "New phone"
              : product.accessoryCategory}
        </span>
      </Link>
      <div className="product-body">
        <span className="overline">{product.brand}</span>
        <Link to={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <p className="product-spec">
          {product.category === "accessory"
            ? product.accessoryCategory
            : `${product.ram ? `${product.ram} GB RAM · ` : ""}${product.storage} GB storage`}
        </p>
        {product.category === "used" && (
          <p className="product-spec">Battery health: {product.battery}%</p>
        )}
        <div
          className={`availability ${!product.available ? "unavailable" : ""}`}
        >
          {isSampleProduct(product) ? "Sample · " : ""}
          {product.available ? "In stock" : "Out of stock"}
        </div>
        <div className="price-row">
          <strong>{money(product.price)}</strong>
          <button
            className="add-button"
            disabled={!product.available}
            onClick={() => add(product.id)}
            aria-label={`Add ${product.name} to bag`}
          >
            <Plus size={19} />
            <span>Add to bag</span>
          </button>
        </div>
        <div className="card-links">
          <Link to={`/product/${product.slug}`}>
            View details <ArrowUpRight size={13} />
          </Link>
          <a
            className="whatsapp-icon-button card-whatsapp"
            href={whatsapp(
              `Hello ${shop.name}, I would like to enquire about ${product.brand} ${product.name}${product.category === "used" ? " (second-hand)" : ""}.`,
            )}
            target="_blank"
            rel="noreferrer"
            aria-label={`Ask about ${product.name} on WhatsApp`}
          >
            <WhatsAppIcon size={20} />
          </a>
        </div>
      </div>
    </article>
  );
}
