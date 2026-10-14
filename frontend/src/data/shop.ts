import { currentLanguage, translateCurrent } from "../context/LanguageContext";
export const shop = {
  name: "Machhapuchhree Electronics",
  location: "Lekhnath, Pokhara, Nepal",
  address: "43MM+778, Lekhnath, Gandaki Province 33700",
  mapName: "S machhapuchhre electronics marmat Kendra",
  phone: "9806600444",
  internationalPhone: "9779806600444",
  hours: "8 AM–6 PM",
};
export const shopMap = "https://www.google.com/maps/search/?api=1&query=28.13313682226093,84.08315061553587";
export const shopDirections = "https://www.google.com/maps/dir/?api=1&destination=28.13313682226093,84.08315061553587";
export const shopMapEmbed = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d219.90240520904894!2d84.08315061553587!3d28.13313682226093!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3995bd003c60c939%3A0x435d2ff8b54a7ae!2sS%20machhapuchhre%20electronics%20marmat%20Kendra!5e0!3m2!1sen!2snp!4v1792001396342!5m2!1sen!2snp";
export const money = (value: number) =>
  `${currentLanguage() === "ne" ? "रु." : "Rs."} ${value.toLocaleString(currentLanguage() === "ne" ? "ne-NP" : "en-NP")}`;
export const whatsapp = (
  message = translateCurrent(
    "Hello {{shop}}, I found your website and would like some information.",
    { shop: shop.name },
  ),
) =>
  `https://wa.me/${shop.internationalPhone}?text=${encodeURIComponent(message)}`;
