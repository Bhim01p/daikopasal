import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeCatalogueDevice,
  saveCatalogueOverride,
  resetCatalogueOverride,
} from "../catalogue-overrides.mjs";

function fakeStore() {
  let data = { catalogueOverrides: {} };
  return {
    read: () => data,
    commit: (next) => {
      data = next;
    },
  };
}

test("catalogue overrides merge by device id and preserve untouched base fields", async () => {
  const base = {
    deviceId: "apple-iphone-16",
    brand: "Apple",
    model: "iPhone 16",
    ram: undefined,
    storage: 128,
    specs: { OS: "iOS" },
  };
  const store = fakeStore();
  assert.deepEqual(mergeCatalogueDevice(base, undefined), base);
  await saveCatalogueOverride(
    store,
    base.deviceId,
    { model: "iPhone 16 (updated)" },
    "owner",
  );
  assert.deepEqual(
    mergeCatalogueDevice(base, store.read().catalogueOverrides[base.deviceId]),
    { ...base, model: "iPhone 16 (updated)" },
  );
  await resetCatalogueOverride(store, base.deviceId, "model");
  assert.deepEqual(
    mergeCatalogueDevice(base, store.read().catalogueOverrides[base.deviceId]),
    base,
  );
});

test("invalid override fields and variants are rejected", async () => {
  const store = fakeStore();
  await assert.rejects(
    () =>
      saveCatalogueOverride(
        store,
        "missing-device",
        { unknown: true },
        "owner",
      ),
    /Unsupported catalogue field/,
  );
  await assert.rejects(
    () =>
      saveCatalogueOverride(
        store,
        "device",
        {
          variants: [
            { ram: 8, storage: 128 },
            { ram: 8, storage: 128 },
          ],
        },
        "owner",
      ),
    /Duplicate catalogue variant/,
  );
});
