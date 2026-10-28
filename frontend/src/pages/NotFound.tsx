import { useT } from "../context/LanguageContext";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
export default function NotFound() {
  const t = useT();
  return (
    <main
      className="container standard-page empty-state"
      aria-labelledby="not-found-title"
    >
      <img
        src="/assets/logo-header.webp"
        alt="Machhapuchhree Electronics"
        width="72"
        height="72"
      />
      <span className="eyebrow">404</span>
      <h1 id="not-found-title">{t("A little off the path.")}</h1>
      <p>{t("We couldn’t find this page. Let’s get you back to the shop.")}</p>
      <Link className="button dark" to="/">
        {t("Back to home ")}
        <ArrowRight size={17} />
      </Link>
    </main>
  );
}
