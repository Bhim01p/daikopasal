import { NavLink, useLocation } from "react-router-dom";
import { useT } from "../context/LanguageContext";
export const shopCategories = [
  {
    to: "/mobiles",
    label: "New phones",
    image: "/assets/catalogue-iphone-15-1000.webp",
    srcSet:
      "/assets/catalogue-iphone-15-640.webp 640w, /assets/catalogue-iphone-15-1000.webp 1000w",
    width: 1000,
    height: 1000,
  },
  {
    to: "/second-hand",
    label: "Used phones",
    image: "/assets/catalogue-redmi-9.png",
    srcSet: undefined,
    width: undefined,
    height: undefined,
  },
  {
    to: "/accessories",
    label: "Accessories",
    image: "/assets/catalogue-redmi-buds-6-play-1280.webp",
    srcSet:
      "/assets/catalogue-redmi-buds-6-play-640.webp 640w, /assets/catalogue-redmi-buds-6-play-1280.webp 1280w",
    width: 2560,
    height: 1400,
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
        <NavLink
          key={category.to}
          to={
            activeQuery
              ? `${category.to}?q=${encodeURIComponent(activeQuery)}`
              : category.to
          }
        >
          {cards && (
            <img
              src={category.image}
              srcSet={category.srcSet}
              sizes="(max-width: 767px) 80px, 33vw"
              width={category.width}
              height={category.height}
              alt={t(category.label)}
            />
          )}
          <span>{t(category.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
