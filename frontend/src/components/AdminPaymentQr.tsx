import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { useT } from "../context/LanguageContext";

export default function AdminPaymentQr() {
  const t = useT();
  const [config, setConfig] = useState({ qrImage: "", instructions: "", accountName: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { void api<{config: typeof config}>("/admin/payment-config").then((r) => setConfig(r.config)).catch((e) => setError(e.message)); }, []);
  async function upload(file?: File) {
    if (!file) return;
    try { const result = await api<{config: typeof config}>("/admin/payment-config/image", { method: "POST", headers: { "Content-Type": file.type }, body: file }); setConfig(result.config); } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
  }
  async function save() {
    try { const result = await api<{config: typeof config}>("/admin/payment-config", { method: "PATCH", body: JSON.stringify(config) }); setConfig(result.config); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
  }
  return <section className="admin-panel payment-qr-panel"><h2>{t("Payment QR")}</h2><p>{t("Manage the QR customers use for pickup and delivery payments.")}</p>
    {config.qrImage && <img src={config.qrImage} alt={t("Current payment QR")} style={{maxWidth:220}} />}
    <div><span>{t("Replace QR image")}</span><label className="button white admin-upload-button" htmlFor="payment-qr-upload">{t("Upload QR image")}</label><input id="payment-qr-upload" className="admin-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void upload(e.target.files?.[0])} /></div>
    <label>{t("Payment/account name")}<input value={config.accountName} onChange={(e) => setConfig({ ...config, accountName: e.target.value })} /></label>
    <label>{t("Payment instructions")}<textarea rows={4} value={config.instructions} onChange={(e) => setConfig({ ...config, instructions: e.target.value })} /></label>
    <button className="button dark" onClick={() => void save()}>{saved ? t("Saved") : t("Save QR settings")}</button>
    {error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
