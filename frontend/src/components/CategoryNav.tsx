import { NavLink, useLocation } from "react-router-dom";
import { useT } from "../context/LanguageContext";
export const shopCategories = [
  {
    to: "/mobiles",
    label: "New phones",
    image: "/assets/catalogue-iphone-15.png",
  },
  {
    to: "/second-hand",
    label: "Used phones",
    image: "/assets/catalogue-redmi-9.png",
  },
  {
    to: "/accessories",
    label: "Accessories",
    image: "/assets/catalogue-redmi-buds-6-play.jpg",
  },
];
export default function CategoryNav({ cards = false }: { cards?: boolean }) {
  const t = useT();
  const location = useLocation();
  const activeQuery = new URLSearchParams(location.search).get("q") || "";
  return (
    <nav
      className={cards ? "shop-category-cards" : "shop-category-switch"}
      aria-label={t("Shop categories")}
    >
      {shopCategories.map((category) => (
        <NavLink key={category.to} to={activeQuery ? `${category.to}?q=${encodeURIComponent(activeQuery)}` : category.to}>
          {cards && <img src={category.image} alt={t(category.label)} />}
          <span>{t(category.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
