import { Heart, GitCompareArrows } from "lucide-react";
import { Link } from "react-router-dom";
import { useFavourites } from "../context/FavouritesContext";
import { useT } from "../context/LanguageContext";
import type { Product } from "../types";
export default function ProductTools({ product }: { product: Product }) {
  const t = useT();
  const { ids, toggle } = useFavourites();
  const saved = ids.includes(product.id);
  return (
    <div className="product-tools">
      <button
        type="button"
        className={saved ? "favourite-button saved" : "favourite-button"}
        aria-pressed={saved}
        aria-label={t(
          saved ? "Remove {{v0}} from favourites" : "Save {{v0}} to favourites",
          { v0: product.name },
        )}
        onClick={() => toggle(product.id)}
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
      </button>
      {product.category !== "accessory" && (
        <Link
          to={"/compare?first=" + encodeURIComponent(product.id)}
          className="compare-link"
        >
          <GitCompareArrows size={16} />
          {t("Compare")}
        </Link>
      )}
    </div>
  );
}
