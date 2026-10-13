import ProductTools from "./ProductTools";
import SafeImage from "./SafeImage";
import { useT } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import WhatsAppIcon from "./WhatsAppIcon";
import type { Product } from "../types";
import { money, shop, whatsapp } from "../data/shop";
import { useCart } from "../context/CartContext";
import { isIllustration, productImageSource } from "../utils/products";
export function ProductImage({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      className={`product-visual ${className}`}
      style={{ backgroundColor: product.color + "24" }}
    >
      <SafeImage
        src={productImageSource(product)}
        alt={`${product.brand} ${product.name}${isIllustration(product) ? " — illustrative placeholder" : ""}`}
        loading="lazy"
      />
      {isIllustration(product) && (
        <span className="image-caption">{t("Illustrative image")}</span>
      )}
    </div>
  );
}
export default function ProductCard({ product }: { product: Product }) {
  const t = useT();
  const { add } = useCart();
  return (
    <article className="product-card">
      <ProductTools product={product} />
      <Link to={`/product/${product.slug}`} className="product-image-link">
        <ProductImage product={product} />
        <span
          className={`badge ${product.category === "used" ? "used-badge" : ""}`}
        >
          {product.category === "used"
            ? t(product.condition || "Inspection pending")
            : product.category === "new"
              ? t("New phone")
              : t(product.accessoryCategory)}
        </span>
      </Link>
      <div className="product-body">
        <span className="overline">{product.brand}</span>
        <Link to={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <p className="product-spec">
          {product.category === "accessory"
            ? t(product.accessoryCategory)
            : t("{{v0}}{{v1}} GB storage", {
                v0: String(product.ram ? `${product.ram} GB RAM · ` : ""),
                v1: String(product.storage),
              })}
        </p>
        {product.category === "used" && product.battery !== undefined && (
          <p className="product-spec">
            {t("Battery health: ")}
            {product.battery}%
          </p>
        )}
        <div
          className={`availability ${!product.available ? "unavailable" : ""}`}
        >
          {product.available ? t("In stock") : t("Contact for availability")}
        </div>
        <div className="price-row">
          <strong>
            {money(product.price)}
            {product.priceIsEstimate && (
              <small className="price-estimate">{t("Estimated price")}</small>
            )}
          </strong>
          <button
            className="add-button"
            disabled={!product.available}
            onClick={() => add(product.id)}
            aria-label={t("Add {{v0}} to cart", { v0: String(product.name) })}
          >
            <Plus size={19} />
            <span>{t("Add to cart")}</span>
          </button>
        </div>
        <div className="card-links">
          <Link to={`/product/${product.slug}`}>
            {t("View details ")}
            <ArrowUpRight size={13} />
          </Link>
          <a
            className="whatsapp-icon-button card-whatsapp"
            href={whatsapp(
              `Hello ${shop.name}, I would like to enquire about ${product.brand} ${product.name}${product.category === "used" ? " (second-hand)" : ""}.`,
            )}
            target="_blank"
            rel="noreferrer"
            aria-label={t("Ask about {{v0}} on WhatsApp", {
              v0: String(product.name),
            })}
          >
            <WhatsAppIcon size={20} />
          </a>
        </div>
      </div>
    </article>
  );
}
