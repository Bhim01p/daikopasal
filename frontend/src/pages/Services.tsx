import { useT } from "../context/LanguageContext";
import {
  Smartphone,
  Bike,
  Monitor,
  Battery,
  Plug,
  Camera,
  Volume2,
  Wrench,
} from "lucide-react";
import { shop, whatsapp } from "../data/shop";
import WhatsAppIcon from "../components/WhatsAppIcon";

export default function Services() {
  const t = useT();
  return (
    <div className="container help-services">
      <section id="phone-repairs" className="help-service">
        <Smartphone size={28} />
        <div>
          <img className="repair-section-photo" src="/assets/phone-repair-workbench.png" alt={t("Phone repair")}/>
          <h2>{t("Phone repair")}</h2>
          <p>
            {t(
              "Tell us your phone brand, model and the issue. We can help with screens, batteries, charging and more.",
            )}
          </p>
          <p>
            {t(
              "All major brands welcome. Parts, cost and timing are confirmed after inspection.",
            )}
          </p>
          <h3>{t("Common repair enquiries")}</h3>
          <div className="help-repair-list">
            {[
              { icon: Monitor, name: "Screen issues" },
              { icon: Battery, name: "Battery issues" },
              { icon: Plug, name: "Charging issues" },
              { icon: Smartphone, name: "Software issues" },
              { icon: Camera, name: "Camera issues" },
              { icon: Volume2, name: "Speaker & microphone" },
              { icon: Wrench, name: "General diagnosis" },
            ].map((item) => (
              <span key={item.name}>
                <item.icon size={18} />
                {t(item.name)}
              </span>
            ))}
          </div>
          <a
            className="button white repair-contact"
            aria-label={t("Ask about phone repair on WhatsApp")}
            href={whatsapp(
              `Hello ${shop.name}, I would like help with a mobile phone repair. My model is: __. The issue is: __.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon /> {t("Ask about repair")}
          </a>
        </div>
      </section>
      <section id="digital-meter-repairs" className="help-service">
        <Bike size={28} />
        <div>
          <img className="repair-section-photo" src="/assets/pulsar-meter-repair.png" alt={t("Digital meter repair")}/>
          <h2>{t("Digital meter repair")}</h2>
          <p>
            {t(
              "Bike or vehicle meter trouble? Tell us the vehicle model, the issue and when it started. Contact us to arrange diagnosis.",
            )}
          </p>
          <p>
            {t(
              "Repair availability, parts, cost and timing depend on inspection. Contact the shop before visiting to confirm.",
            )}
          </p>
          <a
            className="button white repair-contact"
            aria-label={t("Ask about digital meter repair on WhatsApp")}
            href={whatsapp(
              `Hello ${shop.name}, I would like help with a bike / vehicle digital meter repair. My model is: __. The issue is: __.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon /> {t("Ask about repair")}
          </a>
        </div>
      </section>
    </div>
  );
}
