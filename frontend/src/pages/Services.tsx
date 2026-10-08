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
  return (
    <div className="container help-services">
      <section id="phone-repairs" className="help-service">
        <Smartphone size={28} />
        <div>
          <h2>Phone repair</h2>
          <p>
            A cracked screen, battery trouble, or charging issues can interrupt
            your day. Tell us your phone brand, model, and the problem. We’ll
            discuss diagnosis and repair options with you.
          </p>
          <p>
            We accept repair enquiries for all major brands. Availability,
            parts, cost and timing are confirmed after inspection.
          </p>
          <h3>Common repair enquiries</h3>
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
                {item.name}
              </span>
            ))}
          </div>
          <a
            className="whatsapp-icon-button"
            aria-label="Ask about phone repair on WhatsApp"
            href={whatsapp(
              `Hello ${shop.name}, I would like help with a mobile phone repair. My model is: __. The issue is: __.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon />
          </a>
        </div>
      </section>
      <section id="digital-meter-repairs" className="help-service">
        <Bike size={28} />
        <div>
          <h2>Digital meter repair</h2>
          <p>
            We accept diagnosis and repair enquiries for digital meters, mainly
            for bikes and vehicles. Tell us the vehicle model, the issue, and
            when it started. The shop will discuss inspection and possible next
            steps.
          </p>
          <p>
            Repair availability, parts, cost and timing depend on inspection.
            Contact the shop before visiting to confirm.
          </p>
          <a
            className="whatsapp-icon-button"
            aria-label="Ask about digital meter repair on WhatsApp"
            href={whatsapp(
              `Hello ${shop.name}, I would like help with a bike / vehicle digital meter repair. My model is: __. The issue is: __.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon />
          </a>
        </div>
      </section>
    </div>
  );
}
