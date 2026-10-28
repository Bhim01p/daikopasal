import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { useT } from "../context/LanguageContext";
import SafeImage from "./SafeImage";
type Image = { url: string; position?: number };
type Variant = { ram?: number; storage?: number };
type Phone = {
  deviceId: string;
  brand: string;
  model: string;
  variant: string;
  variants?: Variant[];
  specs?: Record<string, string>;
  catalogueImage?: string;
  catalogueImages?: Image[];
  catalogueImageCount?: number;
  hasOverride?: boolean;
};
type Filter = "all" | 3 | 2 | 1 | 0;
export default function AdminPhoneCatalogue({
  onError,
}: {
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const [phones, setPhones] = useState<Phone[]>([]);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Phone | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    brand: "",
    model: "",
    specs: {} as Record<string, string>,
    variants: [] as Variant[],
  });
  const load = async () => {
    try {
      setPhones(
        (await api<{ phones: Phone[] }>("/admin/phone-catalogue")).phones,
      );
    } catch (error) {
      onError(error);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const brands = useMemo(
    () => Array.from(new Set(phones.map((p) => p.brand))).sort(),
    [phones],
  );
  const filtered = phones.filter((p) => {
    const c = p.catalogueImageCount || 0;
    return (
      (brand === "all" || p.brand === brand) &&
      (filter === "all" || (filter === 3 ? c >= 3 : c === filter)) &&
      `${p.brand} ${p.model} ${p.deviceId}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const count = (f: Filter) =>
    phones.filter((p) =>
      f === "all"
        ? true
        : f === 3
          ? (p.catalogueImageCount || 0) >= 3
          : (p.catalogueImageCount || 0) === f,
    ).length;
  const refreshSelected = async () => {
    await load();
    if (selected)
      setSelected(
        (await api<{ phones: Phone[] }>("/admin/phone-catalogue")).phones.find(
          (p) => p.deviceId === selected.deviceId,
        ) || null,
      );
  };
  const edit = (p: Phone) => {
    setSelected(p);
    setDraft({
      brand: p.brand,
      model: p.model,
      specs: p.specs || {},
      variants: p.variants || [],
    });
  };
  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(
        `/admin/phone-catalogue/${encodeURIComponent(selected.deviceId)}`,
        { method: "PATCH", body: JSON.stringify(draft) },
      );
      await refreshSelected();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File, position?: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(
        `/admin/phone-catalogue/${encodeURIComponent(selected.deviceId)}/images${position ? `/${position}` : ""}`,
        { method: "POST", headers: { "Content-Type": file.type }, body: file },
      );
      await refreshSelected();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const effectiveImages = selected?.catalogueImages?.length
    ? selected.catalogueImages
    : selected?.catalogueImage
      ? [{ url: selected.catalogueImage, position: 1 }]
      : [];
  const imageAction = async (position: number, action: "remove" | "main") => {
    if (!selected) return;
    if (
      action === "remove" &&
      !window.confirm(t("Remove this image from the catalogue?"))
    )
      return;
    setBusy(true);
    try {
      await api(
        `/admin/phone-catalogue/${encodeURIComponent(selected.deviceId)}/images/${position}`,
        {
          method: action === "remove" ? "DELETE" : "PATCH",
          body: action === "main" ? JSON.stringify({ main: true }) : undefined,
        },
      );
      await refreshSelected();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const resetImages = async () => {
    if (
      !selected ||
      !window.confirm(t("Reset images to the catalogue default?"))
    )
      return;
    setBusy(true);
    try {
      await api(
        `/admin/phone-catalogue/${encodeURIComponent(selected.deviceId)}/reset`,
        { method: "POST", body: JSON.stringify({ field: "images" }) },
      );
      await refreshSelected();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="admin-panel admin-phone-catalogue"
      id="admin-phone-catalogue"
      role="tabpanel"
    >
      <div className="admin-panel-title">
        <div>
          <h2>{t("Phone Catalogue")}</h2>
          <p>
            {t("Manage reference phone data without changing store products.")}
          </p>
        </div>
        <button className="button white" onClick={() => void load()}>
          {t("Refresh")}
        </button>
      </div>
      <div className="admin-filter-bar">
        <input
          aria-label={t("Search catalogue phones")}
          placeholder={t("Search brand, model or device ID")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="all">{t("All brands")}</option>
          {brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>
      <div className="catalogue-image-filters">
        {(["all", 3, 2, 1, 0] as Filter[]).map((f) => (
          <button
            type="button"
            key={String(f)}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? t("All")
              : f === 3
                ? t("3+ Photos")
                : f === 0
                  ? t("No Photos")
                  : `${f} ${t("Photos")}`}{" "}
            ({count(f)})
          </button>
        ))}
      </div>
      <div className="catalogue-phone-grid">
        {filtered.map((p) => (
          <article className="catalogue-phone-card" key={p.deviceId}>
            <SafeImage
              className="catalogue-phone-thumb"
              src={p.catalogueImage || "/assets/phone.svg"}
              alt={`${p.brand} ${p.model}`}
            />
            <strong>
              {p.brand} {p.model}
            </strong>
            <small>{p.variant}</small>
            <span>
              {p.catalogueImageCount || 0} {t("photos")}
            </span>
            <button className="button white" onClick={() => edit(p)}>
              {t("Edit")}
            </button>
          </article>
        ))}
      </div>
      {selected && (
        <div
          className="admin-editor-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalogue-editor-title"
        >
          <form
            className="admin-panel admin-editor"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <button
              type="button"
              className="button white"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelected(null);
              }}
            >
              {t("Close")}
            </button>
            <h2 id="catalogue-editor-title">
              {selected.brand} {selected.model}
            </h2>
            <label>
              {t("Brand")}
              <input
                value={draft.brand}
                onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
              />
            </label>
            <label>
              {t("Model")}
              <input
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              />
            </label>
            <fieldset>
              <legend>{t("RAM/storage variants")}</legend>
              {draft.variants.map((v, i) => (
                <div className="admin-form-row" key={i}>
                  <input
                    type="number"
                    aria-label={t("RAM (GB)")}
                    value={v.ram ?? ""}
                    onChange={(e) => {
                      const variants = [...draft.variants];
                      variants[i] = {
                        ...v,
                        ram: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      };
                      setDraft({ ...draft, variants });
                    }}
                  />
                  <input
                    type="number"
                    aria-label={t("Storage (GB)")}
                    value={v.storage ?? ""}
                    onChange={(e) => {
                      const variants = [...draft.variants];
                      variants[i] = {
                        ...v,
                        storage: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      };
                      setDraft({ ...draft, variants });
                    }}
                  />
                  <button
                    type="button"
                    className="button white"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        variants: draft.variants.filter((_, n) => n !== i),
                      })
                    }
                  >
                    {t("Remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button white"
                onClick={() =>
                  setDraft({ ...draft, variants: [...draft.variants, {}] })
                }
              >
                {t("Add variant")}
              </button>
            </fieldset>
            <fieldset>
              <legend>{t("Specifications")}</legend>
              {Object.entries(draft.specs).map(([name, value]) => (
                <div className="admin-form-row" key={name}>
                  <label>
                    {name}
                    <input
                      value={value}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          specs: { ...draft.specs, [name]: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            </fieldset>
            <fieldset>
              <legend>{t("Catalogue images")}</legend>
              {[1, 2, 3].map((slot) => {
                const image = effectiveImages.find(
                  (item) => item.position === slot,
                );
                return (
                  <div className="catalogue-image-slot" key={slot}>
                    <strong>
                      {slot === 1 ? t("MAIN") : `${t("IMAGE")} ${slot}`}
                    </strong>
                    {image ? (
                      <>
                        <SafeImage
                          className="admin-catalogue-preview"
                          src={image.url}
                          alt={`${selected.brand} ${selected.model} ${slot}`}
                        />
                        <button
                          type="button"
                          className="button white"
                          disabled={busy}
                          onClick={() => void imageAction(slot, "remove")}
                        >
                          {t("Remove from catalogue")}
                        </button>
                      </>
                    ) : (
                      <p className="summary-note">
                        {t("No image in this slot")}
                      </p>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label={t("Upload catalogue image")}
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void upload(
                            file,
                            image ? slot : slot === 1 ? undefined : slot,
                          );
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                );
              })}
              <button
                type="button"
                className="button white"
                disabled={busy || !selected.hasOverride}
                onClick={() => void resetImages()}
              >
                {t("Reset Images to Catalogue Default")}
              </button>
            </fieldset>
            <div className="button-row">
              <button className="button dark" disabled={busy}>
                {busy ? t("Saving…") : t("Save changes")}
              </button>
              <button
                type="button"
                className="button white"
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelected(null);
                }}
              >
                {t("Cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
