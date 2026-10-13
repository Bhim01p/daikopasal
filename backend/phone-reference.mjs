import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const phoneColumns =
  "id,brand,model,model_number,region,nepal_availability,release_date,ram_gb,storage_gb,display_size_inches,display_type,resolution_pixels,refresh_rate_hz,chipset,gpu,rear_camera_details,front_camera_details,battery_mah,wired_charging_w,wireless_charging_w,launch_os,network_support,sim_details,nfc,headphone_jack,memory_card_support,ip_rating,weight_g,dimensions_mm,source_urls,verified_at".split(
    ",",
  );

// Strict RFC-style parser: quoted delimiters/newlines and escaped quotes are preserved.
export function parsePhoneCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push(row);
        row = [];
      }
    } else if (c === '"' && !field && !closed) quoted = true;
    else {
      if (closed || c === '"') throw new Error("Malformed CSV quoting.");
      field += c;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  if (field || closed || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  if (JSON.stringify(header) !== JSON.stringify(phoneColumns))
    throw new Error("Phone CSV columns do not match the data dictionary.");
  const ids = new Set();
  const numeric = [
    "ram_gb",
    "storage_gb",
    "display_size_inches",
    "refresh_rate_hz",
    "battery_mah",
    "wired_charging_w",
    "wireless_charging_w",
    "weight_g",
  ];
  return rows
    .filter((r) => !(r.length === 1 && !r[0]))
    .map((r, index) => {
      if (r.length !== phoneColumns.length)
        throw new Error(`CSV row ${index + 2}: wrong column count.`);
      const data = Object.fromEntries(
        phoneColumns.map((key, i) => [key, r[i].trim()]),
      );
      const fail = (message) => {
        throw new Error(`CSV row ${index + 2}: ${message}`);
      };
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.id) || ids.has(data.id))
        fail("invalid or duplicate ID.");
      ids.add(data.id);
      if (!data.brand || !data.model || !data.region)
        fail("missing brand, model or region.");
      for (const key of numeric)
        if (
          data[key] &&
          (!/^\d+(?:\.\d+)?$/.test(data[key]) ||
            !Number.isFinite(Number(data[key])))
        )
          fail(`invalid ${key}.`);
      for (const key of ["nfc", "headphone_jack", "memory_card_support"])
        if (!["", "Yes", "No"].includes(data[key])) fail(`invalid ${key}.`);
      if (!["", "Yes", "No", "unconfirmed"].includes(data.nepal_availability))
        fail("invalid Nepal availability.");
      for (const key of ["release_date", "verified_at"]) {
        const date = data[key];
        if (
          (!date && key === "verified_at") ||
          (date &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
              !Number.isFinite(Date.parse(date)) ||
              new Date(date).toISOString().slice(0, 10) !== date))
        )
          fail(`invalid ${key}.`);
      }
      const sourceUrls = data.source_urls
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!sourceUrls.length) fail("missing source URL.");
      for (const value of sourceUrls) {
        let url;
        try {
          url = new URL(value);
        } catch {
          fail("invalid source URL.");
        }
        if (url.protocol !== "https:" || url.username || url.password)
          fail("source URLs must be public HTTPS links.");
      }
      const specs = {};
      const put = (label, value, suffix = "") => {
        if (value !== "") specs[label] = value + suffix;
      };
      put(
        "Display",
        [
          data.display_size_inches && `${data.display_size_inches}-inch`,
          data.display_type,
          data.resolution_pixels,
          data.refresh_rate_hz && `${data.refresh_rate_hz} Hz`,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      for (const [label, key, suffix] of [
        ["Processor", "chipset", ""],
        ["GPU", "gpu", ""],
        ["RAM", "ram_gb", " GB"],
        ["Storage", "storage_gb", " GB"],
        ["Battery", "battery_mah", " mAh"],
        ["Charging", "wired_charging_w", " W"],
        ["Wireless charging", "wireless_charging_w", " W"],
        ["Rear camera", "rear_camera_details", ""],
        ["Front camera", "front_camera_details", ""],
        ["Launch software", "launch_os", ""],
        ["Network", "network_support", ""],
        ["SIM", "sim_details", ""],
        ["NFC", "nfc", ""],
        ["Headphone jack", "headphone_jack", ""],
        ["Memory card", "memory_card_support", ""],
        ["Water resistance", "ip_rating", ""],
        ["Weight", "weight_g", " g"],
        ["Dimensions", "dimensions_mm", " mm"],
        ["Model number", "model_number", ""],
        ["Release date", "release_date", ""],
      ])
        put(label, data[key], suffix);
      if (data.wireless_charging_w === "0") specs["Wireless charging"] = "No";
      return {
        id: `csv-${data.id}`,
        brand: data.brand,
        name: data.model,
        variant: `${data.region} · ${data.ram_gb || "?"} GB / ${data.storage_gb || "?"} GB`,
        sourceUrl: sourceUrls[0],
        sourceUrls,
        checkedAt: data.verified_at,
        nepalAvailability: data.nepal_availability,
        specs,
        raw: data,
        provenance: "Owner-supplied CSV",
      };
    });
}

let catalogue;
export function bundledPhoneCatalogue() {
  if (!catalogue) {
    const phones = JSON.parse(
      readFileSync(
        new URL("./seed/reference-phones.json", import.meta.url),
        "utf8",
      ),
    );
    catalogue = {
      phones,
      revision: createHash("sha256")
        .update(JSON.stringify(phones))
        .digest("hex"),
    };
  }
  return catalogue;
}

// Separate collection in the existing store, including Neon JSONB. No inventory mutations.
export function upgradePhoneCatalogue(current) {
  const { phones, revision } = bundledPhoneCatalogue();
  if (
    current.referenceCatalogueRevision === revision &&
    Array.isArray(current.referencePhones)
  )
    return current;
  const replacements = new Set(phones.map((p) => p.id));
  return {
    ...current,
    referencePhones: [
      ...(current.referencePhones || []).filter((p) => !replacements.has(p.id)),
      ...phones,
    ],
    referenceCatalogueRevision: revision,
  };
}

export function publicReferencePhones(current) {
  return (current.referencePhones || []).map(({ raw, ...phone }) => phone);
}
