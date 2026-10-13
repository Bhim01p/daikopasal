import { AsyncLocalStorage } from "node:async_hooks";
import postgres from "postgres";
import {
  normalizeStore,
  seedStore,
  upgradeStarterCatalogue,
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
        await sql`insert into ${sql(schema)}.store (id, data)
        values (1, ${sql.json(seedStore())}) on conflict (id) do nothing`;
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
        const upgraded = upgradeStarterCatalogue(normalized);
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
    async backupCatalogue(name, data) {
      const tx = snapshot().tx;
      await tx`insert into ${tx(schema)}.catalogue_backups (name, data)
        values (${name}, ${tx.json(data)})`;
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
