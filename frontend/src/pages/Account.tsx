import { useT } from "../context/LanguageContext";
import { normalizeDigits } from "../../../shared/locale.mjs";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, LogOut, UserRound, Package } from "lucide-react";
import { useCustomer } from "../context/CustomerContext";
import { api } from "../utils/api";
import type { Customer } from "../types";

function destination(value: string | null) {
  return value &&
    /^\/(checkout|my-orders|account|order\/[a-zA-Z0-9-]+)$/.test(value)
    ? value
    : "/my-orders";
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
  const [loginEmail, setLoginEmail] = useState("");
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
  if (customer)
    if (embedded) return <Account embedded onComplete={onComplete} />;
    else
      return (
        <Navigate
          replace
          to={
            customer.profileComplete
              ? next
              : `/account?next=${encodeURIComponent(next)}`
          }
        />
      );
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
    setBusy(true);
    setError("");
    try {
      if (!challenge) {
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
            body: JSON.stringify({ challengeId: challenge.challengeId, code }),
          },
        );
        setCustomer(result.customer);
        if (embedded) {
          if (result.customer.profileComplete) onComplete?.();
        } else
          navigate(
            result.customer.profileComplete
              ? next
              : `/account?next=${encodeURIComponent(next)}`,
            { replace: true },
          );
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
              type="email"
              inputMode="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              maxLength={254}
              required
            />
            <p className="summary-note">
              {t("We will email you a six-digit login code.")}
            </p>
          </>
        )}
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
          disabled={busy || mode === "disabled" || (!challenge && !emailValid)}
        >
          {mode === "disabled"
            ? t("Email login unavailable")
            : busy
              ? t("Please wait…")
              : challenge
                ? t("Verify and log in")
                : t("Send login code")}
          <ArrowRight size={18} />
        </button>
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
  useEffect(() => {
    setName(customer?.name || "");
    setEmail(customer?.email || "");
    setPhone(customer?.phone || "");
  }, [customer?.id, customer?.name, customer?.email]);
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
  return (
    <div
      className={`container account-page ${embedded ? "embedded-account" : ""}`}
    >
      <div className="account-heading">
        <span className="eyebrow">{t("Your shop account")}</span>
        <h1>
          {customer.profileComplete
            ? t("Your profile.")
            : t("A few details, just once.")}
        </h1>
        <p>{t("We’ll use these details when you place an order.")}</p>
      </div>
      <div className="account-layout">
        <form className="account-form" onSubmit={save} noValidate>
          <h2>{t("Customer details")}</h2>
          <label>{t("Login email")}</label>
          <p className="account-phone">{customer.email}</p>
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
            {t(
              "Use the inbox where you want to receive order and pickup updates.",
            )}
          </p>
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
        <aside className="account-form account-actions">
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
