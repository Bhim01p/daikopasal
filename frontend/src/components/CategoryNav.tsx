import { NavLink, useLocation } from "react-router-dom";
import { useT } from "../context/LanguageContext";
export const shopCategories: {
  to: string;
  label: string;
  image: string;
  srcSet?: string;
  width?: number;
  height?: number;
  accessory?: string;
}[] = [
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
  {
    to: "/accessories",
    accessory: "Vehicle Meter Repair Parts",
    label: "Vehicle Meter Repair Parts",
    image: "/assets/pulsar-meter-repair-1280.webp",
    srcSet:
      "/assets/pulsar-meter-repair-640.webp 640w, /assets/pulsar-meter-repair-1280.webp 1280w",
    width: 1280,
    height: 720,
  },
];
export default function CategoryNav({ cards = false }: { cards?: boolean }) {
  const t = useT();
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  const activeQuery = currentParams.get("q") || "";
  return (
    <nav
      className={cards ? "shop-category-cards" : "shop-category-switch"}
      aria-label={t("Shop categories")}
    >
      {shopCategories.map((category) => (
        <NavLink
          key={category.accessory || category.to}
          className={({ isActive }) =>
            category.accessory
              ? currentParams.get("accessory") === category.accessory
                ? "active"
                : undefined
              : category.to === "/accessories"
                ? isActive && !currentParams.has("accessory")
                  ? "active"
                  : undefined
                : isActive
                  ? "active"
                  : undefined
          }
          to={(() => {
            const nextParams = new URLSearchParams();
            if (activeQuery) nextParams.set("q", activeQuery);
            if (category.accessory)
              nextParams.set("accessory", category.accessory);
            const search = nextParams.toString();
            return search ? `${category.to}?${search}` : category.to;
          })()}
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
