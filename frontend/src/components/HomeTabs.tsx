import { NavLink } from "react-router-dom";
import { Heart, Store } from "lucide-react";
import { useT } from "../context/LanguageContext";
import { useFavourites } from "../context/FavouritesContext";
export default function HomeTabs() {
  const t = useT();
  const { ids } = useFavourites();
  return (
    <nav className="home-tabs" aria-label={t("Home collections")}>
      <NavLink to="/" end>
        <Store size={16} />
        {t("Explore the shop")}
      </NavLink>
      <NavLink to="/favourites">
        <Heart size={16} />
        {t("Favourites")} <span>{ids.length}</span>
      </NavLink>
    </nav>
  );
}
