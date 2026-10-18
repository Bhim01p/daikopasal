import { AsyncLocalStorage } from "node:async_hooks";
import postgres from "postgres";
import { upgradePhoneCatalogue } from "./phone-reference.mjs";
import {
  normalizeStore,
  seedStore,
  upgradeStarterCatalogue,
  upgradeStarterStock,
  removeStarterListings,
} from "./store.mjs";

// A database row lock serializes stock/order changes across Vercel instances.
// The transaction snapshot stays private to its asynchronous request context.
export function createDatabaseStore(
  url,
  { client, schema = "machhapuchhree" } = {},
) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema))
    throw new Error("Invalid database schema name.");
  if (!url && !client)
    throw new Error("Configure DATABASE_URL before deploying.");
  const sql =
    client ||
    postgres(url, {
      ssl: { rejectUnauthorized: true },
      max: 2,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 300,
      onnotice: () => {},
    });
  const context = new AsyncLocalStorage();
  let initialization;
  async function initialize() {
    if (!initialization)
      initialization = (async () => {
        await sql`create schema if not exists ${sql(schema)}`;
        await sql`create table if not exists ${sql(schema)}.store (
        id integer primary key check (id = 1),
        data jsonb not null, updated_at timestamptz not null default now()
      )`;
        await sql`create table if not exists ${sql(schema)}.images (
        name text primary key, content_type text not null, data bytea not null,
        created_at timestamptz not null default now()
      )`;
        await sql`create table if not exists ${sql(schema)}.catalogue_backups (
        name text primary key, data jsonb not null,
        created_at timestamptz not null default now()
      )`;
        await sql`create table if not exists ${sql(schema)}.catalogue_overrides (
        device_id text primary key,
        override_data jsonb not null,
        updated_at timestamptz not null default now(),
        updated_by text
      )`;
        await sql`insert into ${sql(schema)}.store (id, data)
        values (1, ${sql.json(seedStore([]))}) on conflict (id) do nothing`;
      })().catch((error) => {
        initialization = undefined;
        throw error;
      });
    return initialization;
  }
  function snapshot() {
    const current = context.getStore();
    if (!current) throw new Error("Database access requires a transaction.");
    return current;
  }
  return {
    initialize,
    read() {
      return snapshot().data;
    },
    commit(data) {
      const current = snapshot();
      current.data = data;
      current.dirty = true;
    },
    async transaction(callback) {
      if (context.getStore())
        throw new Error("Nested store transactions are not supported.");
      await initialize();
      return sql.begin(async (tx) => {
        await tx`set local lock_timeout = '15s'`;
        const [row] =
          await tx`select data from ${tx(schema)}.store where id = 1 for update`;
        const normalized = normalizeStore(row.data);
        const upgraded = upgradePhoneCatalogue(
          removeStarterListings(upgradeStarterStock(upgradeStarterCatalogue(normalized))),
        );
        const current = { data: upgraded, dirty: upgraded !== normalized, tx };
        const result = await context.run(current, callback);
        if (current.dirty)
          await tx`update ${tx(schema)}.store
          set data = ${tx.json(current.data)}, updated_at = now() where id = 1`;
        return result;
      });
    },
    async saveImage(name, contentType, data) {
      const tx = snapshot().tx;
      await tx`insert into ${tx(schema)}.images (name, content_type, data)
        values (${name}, ${contentType}, ${data})`;
      return { image: `/api/images/${name}` };
    },
    async readImage(name) {
      const tx = snapshot().tx;
      const [image] = await tx`select content_type, data
        from ${tx(schema)}.images where name = ${name}`;
      return image;
    },
    async deleteImage(name) {
      const tx = snapshot().tx;
      await tx`delete from ${tx(schema)}.images where name = ${name}`;
    },
    async backupCatalogue(name, data) {
      const tx = snapshot().tx;
      await tx`insert into ${tx(schema)}.catalogue_backups (name, data)
        values (${name}, ${tx.json(data)})`;
    },
    async readCatalogueOverrides() {
      const tx = snapshot().tx;
      const rows = await tx`select device_id, override_data, updated_at, updated_by from ${tx(schema)}.catalogue_overrides`;
      return Object.fromEntries(rows.map((row) => [row.device_id, { ...row.override_data, updatedAt: row.updated_at, updatedBy: row.updated_by }]));
    },
    async saveCatalogueOverride(deviceId, data, updatedBy) {
      const tx = snapshot().tx;
      await tx`insert into ${tx(schema)}.catalogue_overrides (device_id, override_data, updated_by) values (${deviceId}, ${tx.json(data)}, ${updatedBy || null}) on conflict (device_id) do update set override_data = excluded.override_data, updated_by = excluded.updated_by, updated_at = now()`;
      return data;
    },
    async deleteCatalogueOverride(deviceId, field) {
      const tx = snapshot().tx;
      if (!field) { await tx`delete from ${tx(schema)}.catalogue_overrides where device_id = ${deviceId}`; return; }
      await tx`update ${tx(schema)}.catalogue_overrides set override_data = override_data - ${field}, updated_at = now() where device_id = ${deviceId}`;
      await tx`delete from ${tx(schema)}.catalogue_overrides where device_id = ${deviceId} and override_data = '{}'::jsonb`;
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
