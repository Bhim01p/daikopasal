import { useT } from "../context/LanguageContext";
import { useLanguage } from "../context/LanguageContext";
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
import ProductTools from "../components/ProductTools";
import EmiCalculator from "../components/EmiCalculator";
import ProductCard from "../components/ProductCard";
import ProductGallery from "../components/ProductGallery";
import WhatsAppIcon from "../components/WhatsAppIcon";
import NotFound from "./NotFound";
import { isSampleProduct, purchaseLimit } from "../utils/products";
export default function Product() {
  const t = useT();
  const { language } = useLanguage();
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
        <Link to="/">{t("Home")}</Link>
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
            ? t("New mobiles")
            : product.category === "used"
              ? t("Second-hand sets")
              : t("Accessories")}
        </Link>
        <ArrowRight size={12} />
        <span>{product.name}</span>
      </div>
      <div className="product-detail">
        <ProductGallery key={product.id} product={product} />
        <div className="detail-copy">
          <span className="eyebrow">
            {product.category === "used" ? t("Second-hand set") : product.brand}
          </span>
          <h1>{product.name}</h1>
          <ProductTools product={product} />
          <div
            className={`availability ${product.available ? "" : "unavailable"}`}
          >
            {product.available
              ? t("In stock · {{v0}} available · Shop pickup", {
                  v0: String(product.stockQuantity),
                })
              : t("Contact for availability")}
          </div>
          <div className="detail-price">
            {money(product.price)}
            {product.priceIsEstimate && (
              <small className="price-estimate">
                {t("Estimated price — confirm with the shop")}
              </small>
            )}
          </div>
          <p>
            {language === "ne"
              ? product.catalogueDescription?.ne || product.descriptionNe || product.description
              : product.catalogueDescription?.en || product.description}
          </p>
          {product.category === "used" && (
            <div className="condition-grid">
              <div>
                <span>{t("Condition")}</span>
                <strong>{t(product.condition || "Inspection pending")}</strong>
              </div>
              <div>
                <span>{t("Battery health")}</span>
                <strong>
                  {product.battery === undefined
                    ? t("Inspection pending")
                    : `${product.battery}%`}
                </strong>
              </div>
              <div>
                <span>{t("Storage")}</span>
                <strong>
                  {product.storage} {t(" GB")}
                </strong>
              </div>
              <div>
                <span>{t("Warranty")}</span>
                <strong>{t("Confirm with shop")}</strong>
              </div>
            </div>
          )}
          {product.category === "used" && <section className="used-condition-report">
            <h2>{t("Inspection report")}</h2>
            <p>{product.inspection?.inspectedAt ? `${t("Inspected")}: ${new Date(product.inspection.inspectedAt).toLocaleDateString()}` : t("Inspection details have not been recorded yet.")}</p>
            <dl>{(["screen", "cameras", "charging", "speakers", "buttons"] as const).map((key) => <div key={key}><dt>{t(key)}</dt><dd>{t(product.inspection?.checks?.[key] === "passed" ? "Passed" : product.inspection?.checks?.[key] === "issue" ? "Issue found" : "Not checked")}</dd></div>)}</dl>
            <p><strong>{t("Known defects")}:</strong> {product.inspection?.defects || t("Not recorded")}</p>
            <p><strong>{t("Included accessories")}:</strong> {product.inspection?.included || t("Not recorded")}</p>
          </section>}
          {(product.priceIsEstimate || isSampleProduct(product)) && (
            <div className="sample-note">
              <Info size={17} />
              <span>
                {t(
                  "Price is an estimate. Availability, condition and warranty require shop confirmation.",
                )}
              </span>
            </div>
          )}
          <EmiCalculator key={product.id} product={product} />
          <label className="quantity-label">{t("Quantity")}</label>
          <div className="purchase-row">
            <div className="quantity">
              <button
                aria-label={t("Decrease quantity")}
                disabled={selectedQuantity === 1 || !maximum}
                onClick={() => setQuantity(selectedQuantity - 1)}
              >
                <Minus size={16} />
              </button>
              <span aria-live="polite">{selectedQuantity}</span>
              <button
                aria-label={t("Increase quantity")}
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
              {t("Add to cart")}
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
              {t("Order for pickup ")}
              <ArrowRight size={16} />
            </button>
            <a
              className="whatsapp-icon-button"
              aria-label={t("Ask about {{v0}} on WhatsApp", {
                v0: String(product.name),
              })}
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
            {t("Shop pickup in Lekhnath · Open ")}
            {t(shop.hours)}
          </div>
        </div>
      </div>
      <section className="specifications">
        <h2>{t("The details, at a glance.")}</h2>
        {product.specSourceUrl && (
          <a
            className="text-link"
            href={product.specSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t("Manufacturer specifications")} ↗
          </a>
        )}
        <dl>
          {Object.entries(product.specs).map(([key, value]) => (
            <div key={key}>
              <dt>{t(key)}</dt>
              <dd>{t(value)}</dd>
            </div>
          ))}
          <div>
            <dt>{t("Product type")}</dt>
            <dd>
              {product.category === "new"
                ? t("New mobile")
                : product.category === "used"
                  ? t("Second-hand mobile")
                  : t("Accessory")}
            </dd>
          </div>
          <div>
            <dt>{t("Collection")}</dt>
            <dd>{t("Shop pickup only")}</dd>
          </div>
        </dl>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>{t("You might also like.")}</h2>
            <p>{t("A few more options to explore.")}</p>
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
            {t("See collection ")}
            <ArrowUpRight size={15} />
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
