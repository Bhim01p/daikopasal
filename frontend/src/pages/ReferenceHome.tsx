import { useT } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useProducts } from "../context/ProductContext";

export default function ReferenceHome() {
  const t = useT();
  const { products } = useProducts();
  return (
    <>
      <div className="container reference-promos">
        <section className="hero reference-banner-main">
          <img
            className="reference-banner-photo"
            src="/assets/shop-banner-v1.png"
            alt={t("Phones and earbuds in a studio setting")}
            fetchPriority="high"
          />
          <div className="hero-copy">
            <span className="eyebrow">{t("Machhapuchhree Electronics")}</span>
            <h1>
              {t("Find your")}
              <br />
              <span>{t("next phone.")}</span>
            </h1>
            <p>
              {t(
                "New and second-hand phones, accessories and friendly help. Visit us in Lekhnath.",
              )}
            </p>
            <Link className="button dark" to="/mobiles">
              {t("Shop new phones ")}
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <div className="reference-side-promos">
          <Link className="reference-promo accessory-promo" to="/accessories">
            <img
              src="/assets/accessories-banner-v1.png"
              alt={t("Headphones, earbuds and a charger")}
            />
            <div>
              <span>{t("Everyday essentials")}</span>
              <h2>{t("Accessories")}</h2>
              <strong>
                {t("Shop now ")}
                <ArrowRight size={16} />
              </strong>
            </div>
          </Link>
          <Link className="reference-promo used-phone-promo" to="/second-hand">
            <img
              src="/assets/shop-banner-v1.png"
              alt={t("Phones and earbuds")}
            />
            <div>
              <span>{t("More options for your budget")}</span>
              <h2>{t("Used phones")}</h2>
              <strong>
                {t("Explore phones ")}
                <ArrowRight size={16} />
              </strong>
            </div>
          </Link>
        </div>
      </div>
      <div
        className="container reference-budget-row"
        aria-label={t("Browse phones by budget")}
      >
        {[20000, 35000, 50000, 70000]
          .filter((price) =>
            products.some(
              (product) => product.category === "new" && product.price <= price,
            ),
          )
          .slice(0, 3)
          .map((price) => (
            <Link key={price} to={`/mobiles?budget=${price}`}>
              {t("Under Rs. ")}
              {price.toLocaleString("en-IN")} <ArrowRight size={15} />
            </Link>
          ))}
      </div>
    </>
  );
}
