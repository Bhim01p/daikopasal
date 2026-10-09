import { useEffect, useState, type FormEvent } from "react";
import { useT } from "../context/LanguageContext";
import { api } from "../utils/api";
import { Plus, Pencil, Users, ShieldCheck } from "lucide-react";

type StaffAccount = {
  id: string;
  name: string;
  username: string;
  enabled: boolean;
  createdAt: string;
};
const emptyDraft = {
  id: "",
  name: "",
  username: "",
  password: "",
  confirmation: "",
};

export default function StaffManager({
  onError,
}: {
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<{ staff: StaffAccount[] }>("/admin/staff")
      .then((result) => {
        if (active) setAccounts(result.staff);
      })
      .catch((error) => {
        if (active) onError(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function reload() {
    const result = await api<{ staff: StaffAccount[] }>("/admin/staff");
    setAccounts(result.staff);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (draft.password !== draft.confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api(
        `/admin/staff${draft.id ? `/${encodeURIComponent(draft.id)}` : ""}`,
        {
          method: draft.id ? "PATCH" : "POST",
          body: JSON.stringify({
            name: draft.name,
            username: draft.username,
            ...(!draft.id || draft.password
              ? { password: draft.password }
              : {}),
          }),
        },
      );
      await reload();
      setDraft(emptyDraft);
      setNotice(
        "Staff login saved. Share the username and password privately.",
      );
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(account: StaffAccount) {
    if (
      account.enabled &&
      !window.confirm(
        t(
          "Disable this staff login? Their current sessions will stop working.",
        ),
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      await api(`/admin/staff/${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !account.enabled }),
      });
      await reload();
      setNotice(
        account.enabled ? "Staff login disabled." : "Staff login enabled.",
      );
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="admin-staff"
      role="tabpanel"
      aria-labelledby="staff-tab"
      className="staff-manager"
    >
      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>
            <Users size={20} /> {t("Staff logins")}
          </h2>
          <button
            className="button white"
            disabled={busy}
            onClick={() => {
              setDraft(emptyDraft);
              setNotice("");
            }}
          >
            <Plus size={17} /> {t("New staff login")}
          </button>
        </div>
        <p className="summary-note">
          {t(
            "Staff can manage orders and inventory. Only the main admin can create or change staff logins.",
          )}
        </p>
        {loading ? (
          <p role="status">{t("Loading staff logins…")}</p>
        ) : accounts.length === 0 ? (
          <div className="staff-empty">
            <Users size={32} />
            <h3>{t("No staff logins yet")}</h3>
            <p>{t("Create the first staff login using the form.")}</p>
          </div>
        ) : (
          <ul className="staff-list">
            {accounts.map((account) => (
              <li key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <span>{account.username}</span>
                  <small
                    className={
                      account.enabled ? "staff-active" : "staff-disabled"
                    }
                  >
                    {t(account.enabled ? "Active" : "Disabled")}
                  </small>
                </div>
                <div className="staff-actions">
                  <button
                    className="button white"
                    disabled={busy}
                    aria-label={t("Edit staff {{name}}", {
                      name: account.name,
                    })}
                    onClick={() => {
                      setDraft({
                        ...emptyDraft,
                        id: account.id,
                        name: account.name,
                        username: account.username,
                      });
                      setNotice("");
                    }}
                  >
                    <Pencil size={15} /> {t("Edit")}
                  </button>
                  <button
                    className="button white"
                    disabled={busy}
                    onClick={() => void toggle(account)}
                  >
                    {t(account.enabled ? "Disable login" : "Enable login")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form className="admin-panel staff-editor" onSubmit={save}>
        <h2>{t(draft.id ? "Edit staff login" : "Create staff login")}</h2>
        <p className="summary-note">
          <ShieldCheck size={17} />{" "}
          {t("Passwords are stored securely and are never shown again.")}
        </p>
        <label htmlFor="staff-name">{t("Staff name")}</label>
        <input
          id="staff-name"
          value={draft.name}
          required
          minLength={2}
          maxLength={100}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <label htmlFor="staff-username">{t("Staff username")}</label>
        <input
          id="staff-username"
          value={draft.username}
          required
          minLength={3}
          maxLength={40}
          pattern="[A-Za-z0-9_.\-]{3,40}"
          autoComplete="off"
          onChange={(e) => setDraft({ ...draft, username: e.target.value })}
        />
        <p className="summary-note">
          {t("Use 3–40 letters, numbers, dots, hyphens or underscores.")}
        </p>
        <label htmlFor="staff-password">
          {t(draft.id ? "New password (optional)" : "Staff password")}
        </label>
        <input
          id="staff-password"
          type="password"
          autoComplete="new-password"
          value={draft.password}
          required={!draft.id}
          minLength={12}
          maxLength={200}
          onChange={(e) => setDraft({ ...draft, password: e.target.value })}
        />
        <label htmlFor="staff-confirmation">{t("Repeat password")}</label>
        <input
          id="staff-confirmation"
          type="password"
          autoComplete="new-password"
          value={draft.confirmation}
          required={!draft.id || !!draft.password}
          maxLength={200}
          onChange={(e) => setDraft({ ...draft, confirmation: e.target.value })}
        />
        <p className="summary-note">
          {t(
            draft.id
              ? "Leave both password fields empty to keep the current password."
              : "Use at least 12 characters for the password.",
          )}
        </p>
        {error && (
          <p role="alert" className="field-error">
            {t(error)}
          </p>
        )}
        {notice && (
          <p role="status" className="admin-notice">
            {t(notice)}
          </p>
        )}
        <div className="staff-actions">
          <button className="button dark" disabled={busy}>
            {t(busy ? "Saving…" : "Save staff login")}
          </button>
          {draft.id && (
            <button
              type="button"
              className="button white"
              disabled={busy}
              onClick={() => setDraft(emptyDraft)}
            >
              {t("Cancel")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
