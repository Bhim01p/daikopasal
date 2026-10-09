import { useT } from "../context/LanguageContext";
import Services from "./Services";

export default function Repair() {
  const t = useT();
  return (
    <>
      <div className="page-intro">
        <div className="container">
          <h1>{t("Repair")}</h1>
          <p>
            {t(
              "Phone and digital meter repair enquiries, with friendly help from our shop.",
            )}
          </p>
        </div>
      </div>
      <Services />
    </>
  );
}
