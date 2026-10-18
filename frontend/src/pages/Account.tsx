import { LanguageSwitch, useT } from "../context/LanguageContext";
import { normalizeDigits } from "../../../shared/locale.mjs";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  LogOut,
  UserRound,
  Package,
  LockKeyhole,
  Heart,
  CircleHelp,
  X,
} from "lucide-react";
import { useCustomer } from "../context/CustomerContext";
import { api } from "../utils/api";
import type { Customer } from "../types";
import AccountSettings from "../components/AccountSettings";
import CustomerRepairs from "../components/CustomerRepairs";
import { whatsapp } from "../data/shop";

function destination(value: string | null) {
  return value &&
    /^\/(checkout|my-orders|account|repair|order\/[a-zA-Z0-9-]+)$/.test(value)
    ? value
    : "/";
}
export function Login({
  embedded = false,
  onComplete,
}: { embedded?: boolean; onComplete?: () => void } = {}) {
  const t = useT();
  const formId = useId();
  const {
    customer,
    checking,
    mode,
    error: sessionError,
    refresh,
    setCustomer,
  } = useCustomer();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = destination(params.get("next"));
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      return localStorage.getItem("me-login-email") || "";
    } catch {
      return "";
    }
  });
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [recovering, setRecovering] = useState(params.get("recovery") === "1");
  const emailValid = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(loginEmail.trim());
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    expiresAt: number;
    resendAvailableAt?: number;
    developmentCode?: string;
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resendSeconds = challenge
    ? Math.max(
        0,
        Math.ceil(
          ((challenge.resendAvailableAt ?? challenge.expiresAt - 240000) -
            now) /
            1000,
        ),
      )
    : 0;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (customer) {
      setChallenge(null);
      setCode("");
      setError("");
    }
  }, [customer?.id]);
  if (checking)
    return (
      <div className="container empty-state" role="status">
        {t("Checking your login…")}
      </div>
    );
  if (customer) return <Account embedded={embedded} onComplete={onComplete} />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || mode === "disabled") return;
    if (!challenge && !emailValid) {
      setError("Enter a valid email address for order updates.");
      document.getElementById(`${formId}-login-email`)?.focus();
      return;
    }
    if (challenge && !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      document.getElementById(`${formId}-code`)?.focus();
      return;
    }
    if (passwordMode && !challenge && !password) {
      setError("Enter your password.");
      return;
    }
    const finish = (user: Customer) => {
      setCustomer(user);
      if (embedded) onComplete?.();
      navigate(recovering ? "/account?security=1" : next, { replace: true });
    };
    setBusy(true);
    setError("");
    try {
      if (passwordMode && !challenge) {
        const result = await api<{ customer: Customer }>(
          "/customer/auth/password",
          {
            method: "POST",
            body: JSON.stringify({
              email: loginEmail.trim().toLowerCase(),
              password,
              rememberMe,
            }),
          },
        );
        setPassword("");
        finish(result.customer);
      } else if (!challenge) {
        const result = await api<{
          challengeId: string;
          expiresAt: number;
          developmentCode?: string;
        }>("/customer/auth/start", {
          method: "POST",
          body: JSON.stringify({ email: loginEmail.trim().toLowerCase() }),
        });
        setChallenge({ ...result, resendAvailableAt: Date.now() + 60000 });
        setCode("");
      } else {
        const result = await api<{ customer: Customer }>(
          "/customer/auth/verify",
          {
            method: "POST",
            body: JSON.stringify({
              challengeId: challenge.challengeId,
              code,
              rememberMe,
            }),
          },
        );
        finish(result.customer);
      }
      if (passwordMode || challenge) {
        try {
          if (rememberMe)
            localStorage.setItem(
              "me-login-email",
              loginEmail.trim().toLowerCase(),
            );
          else localStorage.removeItem("me-login-email");
        } catch {
          /* Browser storage can be disabled. */
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`container account-page ${embedded ? "embedded-account" : ""}`}
    >
      {!embedded && <div className="login-language"><LanguageSwitch /></div>}
      <div className="account-heading">
        <span className="eyebrow">{t("Your shop account")}</span>
        <h1>{t("Welcome back.")}</h1>
        <p>{t("Save your details and follow your pickup orders.")}</p>
      </div>
      <form className="account-form" onSubmit={submit} noValidate>
        <UserRound size={32} />
        <h2>
          {challenge ? t("Enter your code") : t("Log in with your email")}
        </h2>
        {!challenge && (
          <div className="login-methods">
            <button
              type="button"
              disabled={busy}
              className={passwordMode ? "button secondary" : "button dark"}
              onClick={() => {
                setPasswordMode(false);
                setPassword("");
                setError("");
                setRecovering(false);
              }}
            >
              {t("Email code")}
            </button>
            <button
              type="button"
              disabled={busy}
              className={passwordMode ? "button dark" : "button secondary"}
              onClick={() => {
                setPasswordMode(true);
                setRecovering(false);
                setError("");
              }}
            >
              {t("Password login")}
            </button>
          </div>
        )}
        {mode === "disabled" && (
          <p className="account-demo-note">
            {t(
              "Email login is being set up. You can still browse and use guest checkout.",
            )}
          </p>
        )}
        {challenge ? (
          <>
            <p>
              {t("For ")}
              {loginEmail}
              {t(". Your code expires after five minutes.")}
            </p>
            <label htmlFor={`${formId}-code`}>{t("Verification code")}</label>
            <input
              id={`${formId}-code`}
              disabled={busy}
              value={code}
              onChange={(e) =>
                setCode(normalizeDigits(e.target.value).replace(/\D/g, ""))
              }
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              required
              autoFocus
            />
          </>
        ) : (
          <>
            <label htmlFor={`${formId}-login-email`}>
              {t("Email address")}
            </label>
            <input
              id={`${formId}-login-email`}
              disabled={busy}
              type="email"
              inputMode="email"
              autoComplete="username"
              name="username"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              maxLength={254}
              required
            />
            {passwordMode && (
              <>
                <label htmlFor={`${formId}-password`}>{t("Password")}</label>
                <input
                  id={`${formId}-password`}
                  disabled={busy}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  maxLength={128}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="text-link"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPasswordMode(false);
                    setRecovering(true);
                    setPassword("");
                    setError("");
                  }}
                >
                  {t("Forgot password or first time here?")}
                </button>
              </>
            )}
            <p className="summary-note">
              {t(
                passwordMode
                  ? "Use your saved password, or sign in with an email code to create one."
                  : recovering
                    ? "Sign in with an email code, then set a new password in your profile."
                    : "We will email you a six-digit login code.",
              )}
            </p>
          </>
        )}
        <label className="remember-login">
          <input
            type="checkbox"
            disabled={busy}
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          {t("Remember me for 30 days")}
        </label>
        {(error || sessionError) && (
          <p className="field-error" role="alert">
            {t(error || sessionError)}
          </p>
        )}
        {sessionError && (
          <button
            type="button"
            className="button white"
            onClick={() => void refresh()}
          >
            {t("Check connection")}
          </button>
        )}
        <button
          className="button dark full"
          disabled={
            busy ||
            mode === "disabled" ||
            (!challenge && (!emailValid || (passwordMode && !password))) ||
            (!!challenge && now >= challenge.expiresAt)
          }
        >
          {mode === "disabled"
            ? t("Email login unavailable")
            : busy
              ? t("Please wait…")
              : challenge
                ? t("Verify and log in")
                : passwordMode
                  ? t("Sign in")
                  : t("Send login code")}
          <ArrowRight size={18} />
        </button>
        {challenge && now >= challenge.expiresAt && (
          <p role="alert" className="field-error">
            {t("Your code has expired. Request a new code.")}
          </p>
        )}
        {challenge && (
          <div className="otp-actions">
            <button
              className="button white full"
              type="button"
              disabled={busy}
              onClick={() => {
                setChallenge(null);
                setCode("");
                setError("");
              }}
            >
              {t("Change email")}
            </button>
            <button
              type="button"
              className="button white full"
              disabled={busy || resendSeconds > 0}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await api<NonNullable<typeof challenge>>(
                    "/customer/auth/start",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        email: loginEmail.trim().toLowerCase(),
                      }),
                    },
                  );
                  setChallenge({
                    ...result,
                    resendAvailableAt: Date.now() + 60000,
                  });
                  setCode("");
                  setNow(Date.now());
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Please try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {resendSeconds > 0
                ? t("Resend in {{v0}}s", { v0: String(resendSeconds) })
                : t("Resend code")}
            </button>
          </div>
        )}
        {embedded ? (
          <button type="button" className="text-link" onClick={onComplete}>
            {t("Continue browsing")}
          </button>
        ) : (
          <Link className="text-link" to="/mobiles">
            {t("Continue browsing")}
          </Link>
        )}
      </form>
    </div>
  );
}

export default function Account({
  embedded = false,
  onComplete,
}: { embedded?: boolean; onComplete?: () => void } = {}) {
  const t = useT();
  const formId = useId();
  const {
    customer,
    checking,
    error: sessionError,
    setCustomer,
    logout,
  } = useCustomer();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editing = params.get("edit") === "1";
  const security = params.get("security") === "1";
  const sheet = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!security || checking || !customer || !sheet.current) return;
    const dialog = sheet.current,
      previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [security, checking, customer?.id]);
  useEffect(() => {
    setName(customer?.name || "");
    setEmail(customer?.email || "");
    setPhone(customer?.phone || "");
  }, [customer?.id, customer?.name, customer?.email, customer?.phone]);
  if (checking)
    return (
      <div className="container empty-state" role="status">
        {t("Opening your account…")}
      </div>
    );
  if (!customer)
    return (
      <div className="container standard-page empty-state">
        <UserRound size={38} />
        <h1>{t("Your shop account.")}</h1>
        <p>{t("Log in to save your details and see your orders.")}</p>
        {sessionError && <p role="alert">{t(sessionError)}</p>}
        <Link className="button dark" to="/login?next=/account">
          {t("Log in with your email")}
        </Link>
      </div>
    );
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      document.getElementById(`${formId}-name`)?.focus();
      return;
    }
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim())) {
      setError("Enter a valid email address for order updates.");
      document.getElementById(`${formId}-email`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ customer: Customer }>("/customer/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, email, phone }),
      });
      setCustomer(result.customer);
      setNotice("Your details have been saved.");
      if (embedded) onComplete?.();
      else if (params.get("next"))
        navigate(destination(params.get("next")), { replace: true });
      else navigate("/account", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
      if (!embedded) navigate("/login", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!editing)
    return (
      <section className="container account-page account-overview">
        <div className="account-heading">
          <h1>{t("My account")}</h1>
        </div>
        <div className="account-menu-card">
          <div className="account-welcome">
            {customer.photo ? (
              <img
                className="profile-photo-preview"
                src={customer.photo}
                alt={t("Profile photo")}
              />
            ) : (
              <span className="profile-photo-placeholder">
                <UserRound size={30} />
              </span>
            )}
            <div>
              <small>{t("Welcome back.")}</small>
              <h2>{customer.name || customer.email}</h2>
              <p>{customer.email}</p>
            </div>
            <button
              className="icon-button account-signout"
              disabled={busy}
              onClick={() => void signOut()}
              aria-label={t("Log out")}
            >
              <LogOut size={20} />
            </button>
          </div>
          {!customer.profileComplete && (
            <p className="summary-note">
              {t(
                "Add your name and phone before placing an account order. You can keep browsing now.",
              )}
            </p>
          )}
          <Link
            className="account-menu-row"
            onClick={onComplete}
            to={`/account?edit=1${params.get("next") ? `&next=${encodeURIComponent(destination(params.get("next")))}` : ""}`}
          >
            <UserRound size={21} />
            <span>
              {t(
                customer.profileComplete ? "Edit details" : "Complete profile",
              )}
            </span>
            <ChevronRight size={18} />
          </Link>
          <Link
            className="account-menu-row"
            onClick={onComplete}
            to="/account?security=1"
          >
            <LockKeyhole size={21} />
            <span>{t("Change password")}</span>
            <ChevronRight size={18} />
          </Link>
          <Link
            className="account-menu-row"
            onClick={onComplete}
            to="/my-orders"
          >
            <Package size={21} />
            <span>{t("My orders")}</span>
            <ChevronRight size={18} />
          </Link>
          <Link
            className="account-menu-row"
            onClick={onComplete}
            to="/favourites"
          >
            <Heart size={21} />
            <span>{t("Favourites")}</span>
            <ChevronRight size={18} />
          </Link>
          <Link className="account-menu-row" onClick={onComplete} to="/help">
            <CircleHelp size={21} />
            <span>{t("Help")}</span>
            <ChevronRight size={18} />
          </Link>
          <Link className="text-link" onClick={onComplete} to="/shop">
            {t("Continue shopping")}
          </Link>
          {error && <p role="alert">{t(error)}</p>}
          <div className="account-support">
            <p>{t("Need help with your account or order?")}</p>
            <a href={whatsapp()} target="_blank" rel="noreferrer">
              {t("Message on WhatsApp")}
            </a>
          </div>
        </div>
        <CustomerRepairs />
        {security && (
          <dialog
            ref={sheet}
            className="password-sheet"
            aria-label={t("Change password")}
            onCancel={(e) => {
              e.preventDefault();
              navigate("/account");
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                const r = e.currentTarget.getBoundingClientRect();
                if (
                  e.clientX < r.left ||
                  e.clientX > r.right ||
                  e.clientY < r.top ||
                  e.clientY > r.bottom
                )
                  navigate("/account");
              }
            }}
          >
            <div className="sheet-handle" />
            <button
              className="icon-button sheet-close"
              aria-label={t("Back to account")}
              onClick={() => navigate("/account")}
            >
              <X size={20} />
            </button>
            <AccountSettings
              section="password"
              onPasswordSaved={() => navigate("/account", { replace: true })}
            />
          </dialog>
        )}
      </section>
    );
  return (
    <div
      className={`container account-page profile-editor ${embedded ? "embedded-account" : ""}`}
    >
      <div className="account-heading">
        <Link className="text-link" to="/account">
          <ArrowLeft size={20} />
          <span className="sr-only">{t("Back to account")}</span>
        </Link>
        <h1>{t("Your profile.")}</h1>
      </div>
      <div className="account-layout">
        <form className="account-form" onSubmit={save} noValidate>
          <AccountSettings section="photo" />
          <label htmlFor={`${formId}-name`}>{t("Full name")}</label>
          <input
            id={`${formId}-name`}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
          <label htmlFor={`${formId}-email`}>{t("Email address")}</label>
          <input
            id={`${formId}-email`}
            readOnly
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            required
          />
          <p className="summary-note">
            {t("To use another email, sign out and verify that email.")}
          </p>
          <label htmlFor={`${formId}-phone`}>{t("Nepal mobile number")}</label>
          <input
            id={`${formId}-phone`}
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(normalizeDigits(e.target.value))}
            required
          />
          {error && (
            <p className="field-error" role="alert">
              {t(error)}
            </p>
          )}
          {notice && (
            <p className="account-notice" role="status">
              {t(notice)}
            </p>
          )}
          <button className="button dark full" disabled={busy}>
            {busy
              ? t("Saving…")
              : !customer.profileComplete || (!embedded && params.get("next"))
                ? t("Save and continue")
                : t("Save details")}
            <ArrowRight size={18} />
          </button>
        </form>
        <aside className="account-form account-actions profile-editor-aside">
          <Package size={32} />
          <h2>{t("Follow your orders")}</h2>
          <p>
            {t(
              "See orders placed while signed in, with their current pickup status.",
            )}
          </p>
          <Link className="button white full" to="/my-orders">
            {t("My orders")}
            <ArrowRight size={18} />
          </Link>
          <button
            className="button white full"
            disabled={busy}
            onClick={() => void signOut()}
          >
            <LogOut size={18} />
            {t("Log out")}
          </button>
        </aside>
      </div>
    </div>
  );
}
