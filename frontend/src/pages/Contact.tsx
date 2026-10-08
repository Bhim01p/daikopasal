import { useState, type FormEvent } from "react";
import {
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import { shop, shopMap, shopDirections, whatsapp } from "../data/shop";
import Services from "./Services";
import WhatsAppIcon from "../components/WhatsAppIcon";
export default function Contact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (
      name.trim().length < 2 ||
      !message.trim() ||
      !/^(?:\+977|977)?9[78]\d{8}$/.test(phone.replace(/[\s()-]/g, ""))
    ) {
      setError(
        "Please enter your name, a valid Nepal mobile number, and a message.",
      );
      setDraft("");
      return;
    }
    setError("");
    setDraft(
      whatsapp(
        `Hello ${shop.name},\nName: ${name.trim()}\nPhone: ${phone.trim()}\n\n${message.trim()}`,
      ),
    );
  }
  return (
    <>
      <div className="page-intro">
        <div className="container">
          <h1>Contact & Help</h1>
          <p>
            A question about a phone, an accessory, or a repair? We’re here to
            talk.
          </p>
        </div>
      </div>
      <div className="container contact-layout">
        <div>
          <h2>{shop.name}</h2>
          <div className="contact-detail">
            <MapPin />
            <div>
              <strong>Find us in Lekhnath</strong>
              <p>{shop.address}</p>
            </div>
          </div>
          <div className="contact-detail">
            <Clock />
            <div>
              <strong>Opening hours</strong>
              <p>{shop.hours}</p>
            </div>
          </div>
          <div className="contact-detail">
            <Phone />
            <div>
              <strong>Call or WhatsApp</strong>
              <p>
                <a href={`tel:+${shop.internationalPhone}`}>{shop.phone}</a>
              </p>
            </div>
          </div>
          <div className="button-row">
            <a className="button dark" href={`tel:+${shop.internationalPhone}`}>
              <Phone size={17} />
              Call now
            </a>
            <a
              className="whatsapp-icon-button"
              aria-label="Chat with shop on WhatsApp"
              href={whatsapp()}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
            </a>
          </div>
          <div className="shop-map-card">
            <MapPin size={33} />
            <h3>Visit our store</h3>
            <p>
              Find us on Google Maps as <strong>{shop.mapName}</strong>.
            </p>
            <div className="button-row">
              <a
                className="button dark"
                href={shopDirections}
                target="_blank"
                rel="noreferrer"
              >
                Get directions <ArrowUpRight size={17} />
              </a>
              <a
                className="shop-map-link"
                href={shopMap}
                target="_blank"
                rel="noreferrer"
              >
                View on Google Maps <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </div>
        <form className="contact-form" onSubmit={submit} noValidate>
          <h2>What’s on your mind?</h2>
          <p>Fill in your details to prepare a WhatsApp message.</p>
          <label htmlFor="contact-name">Name *</label>
          <input
            id="contact-name"
            autoComplete="name"
            required
            value={name}
            maxLength={100}
            onChange={(e) => {
              setName(e.target.value);
              setDraft("");
            }}
          />
          <label htmlFor="contact-phone">Phone *</label>
          <input
            id="contact-phone"
            autoComplete="tel"
            type="tel"
            required
            value={phone}
            maxLength={20}
            onChange={(e) => {
              setPhone(e.target.value);
              setDraft("");
            }}
          />
          <label htmlFor="contact-message">Message *</label>
          <textarea
            id="contact-message"
            rows={5}
            required
            value={message}
            maxLength={2000}
            onChange={(e) => {
              setMessage(e.target.value);
              setDraft("");
            }}
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button className="button dark" type="submit">
            Prepare WhatsApp message <ArrowUpRight size={17} />
          </button>
          {draft && (
            <div className="prepared-message" role="status">
              <p>
                Your message is ready. Open WhatsApp, review it, and send it to
                the shop.
              </p>
              <a
                className="button teal"
                href={draft}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} />
                Open WhatsApp
              </a>
            </div>
          )}
          <p className="privacy-note">
            This form prepares a message. Nothing is sent until you send it in
            WhatsApp.
          </p>
        </form>
      </div>
      <Services />
    </>
  );
}
