import { useT } from "../context/LanguageContext";
export default function CancellationPolicy() {
  const t = useT();
  return (
    <details className="cancellation-policy">
      <summary>{t("View cancellation terms")}</summary>
      <p>
        {t(
          "Contact the shop as soon as possible to cancel. A cancellation fee may apply depending on the product, time remaining before agreed pickup, and preparation already completed, including sourcing and staff labour.",
        )}
      </p>
      <p>
        {t(
          "The shop will explain any specific fee and its calculation for your agreement before confirming the order. No cancellation fee is charged automatically on this website.",
        )}
      </p>
    </details>
  );
}
