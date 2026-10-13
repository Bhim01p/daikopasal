import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound, Camera } from "lucide-react";
import { api } from "../utils/api";
import { useCustomer } from "../context/CustomerContext";
import { useT } from "../context/LanguageContext";
import type { Customer } from "../types";

async function avatarBlob(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Could not prepare this photo. Try another image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 512);
    context.drawImage(
      image,
      (image.naturalWidth - size) / 2,
      (image.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      512,
      512,
    );
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error("Could not prepare this photo. Try another image."),
              ),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function AccountSettings({
  section = "all",
}: {
  section?: "all" | "photo" | "password";
}) {
  const { customer, setCustomer, logout } = useCustomer();
  const t = useT(),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  if (!customer) return null;
  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const blob = await avatarBlob(file);
      const result = await api<{ customer: Customer }>("/customer/photo", {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      setCustomer(result.customer);
      setNotice("Profile photo saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ customer: Customer }>("/customer/photo", {
        method: "DELETE",
      });
      setCustomer(result.customer);
      setNotice("Profile photo removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ customer: Customer }>("/customer/password", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setCustomer(result.customer);
      setPassword("");
      setConfirm("");
      setNotice("Password saved. Other sessions have been signed out.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="customer-settings">
      {section !== "password" && (
        <>
          <div className="profile-photo-control">
            {customer.photo ? (
              <img
                className="profile-photo-preview"
                src={customer.photo}
                alt={t("Profile photo")}
              />
            ) : (
              <span className="profile-photo-placeholder">
                <UserRound size={48} />
              </span>
            )}
            <label
              className="profile-upload"
              title={t("Upload or change photo")}
            >
              <Camera size={18} />
              <span className="sr-only">{t("Upload or change photo")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {customer.photo && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void remove()}
            >
              {t("Remove photo")}
            </button>
          )}
        </>
      )}
      {section !== "photo" && (
        <>
          <h2>
            {t(customer.hasPassword ? "Reset password" : "Set a password")}
          </h2>
          <p className="summary-note">
            {t(
              "Verify your email with a fresh login code before setting or resetting your password.",
            )}
          </p>
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await logout();
                navigate("/login?next=/account&recovery=1");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Verify email again")}
          </button>
          <form onSubmit={savePassword}>
            <label>
              {t("New password")}
              <input
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                minLength={10}
                maxLength={128}
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              {t("Confirm password")}
              <input
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                minLength={10}
                maxLength={128}
                required
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button className="button dark" disabled={busy}>
              {t("Save password")}
            </button>
          </form>
        </>
      )}
      {busy && <p role="status">{t("Saving…")}</p>}
      {error && (
        <p role="alert" className="field-error">
          {t(error)}
        </p>
      )}
      {notice && <p role="status">{t(notice)}</p>}
    </section>
  );
}
