import CategoryNav from "../components/CategoryNav";
import { useT } from "../context/LanguageContext";
export default function Shop() {
  const t = useT();
  return (
    <section className="container standard-page shop-category-page">
      <h1>{t("Shop")}</h1>
      <p className="muted">{t("Choose a category")}</p>
      <CategoryNav cards />
    </section>
  );
}
