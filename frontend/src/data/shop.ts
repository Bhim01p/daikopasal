export const shop = {
  name: "Machhapuchhree Electronics",
  location: "Lekhnath, Pokhara, Nepal",
  address: "43MM+778, Lekhnath, Gandaki Province 33700",
  mapName: "S machhapuchhre electronics marmat Kendra",
  phone: "9806600444",
  internationalPhone: "9779806600444",
  hours: "8 AM–6 PM",
};
const mapQuery = encodeURIComponent(`${shop.mapName}, ${shop.address}`);
export const shopMap = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
export const shopDirections = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;
export const money = (value: number) => `Rs. ${value.toLocaleString("en-NP")}`;
export const whatsapp = (
  message = `Hello ${shop.name}, I found your website and would like some information.`,
) =>
  `https://wa.me/${shop.internationalPhone}?text=${encodeURIComponent(message)}`;
