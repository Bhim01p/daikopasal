import { useFavourites } from "../context/FavouritesContext";
import { useProducts } from "../context/ProductContext";
import { useT } from "../context/LanguageContext";
import ProductCard from "../components/ProductCard";
import HomeTabs from "../components/HomeTabs";
import { Link } from "react-router-dom";
export default function Favourites() {
  const t = useT();
  const { ids } = useFavourites();
  const { products } = useProducts();
  const saved = products.filter((p) => ids.includes(p.id));
  return (
    <>
      <HomeTabs />
      <section className="container standard-page favourites-page">
        <span className="eyebrow">{t("Saved for later")}</span>
        <h1>{t("Your favourites")}</h1>
        <p className="muted">
          {t("Saved in this browser. Tap the heart to add or remove an item.")}
        </p>
        {saved.length ? (
          <div className="product-grid catalogue-grid">
            {saved.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>{t("No favourites yet")}</h2>
            <Link className="button dark" to="/mobiles">
              {t("Explore mobiles")}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
