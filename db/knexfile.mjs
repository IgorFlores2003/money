// Migrações rodam direto no Postgres do Supabase (veja README).
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { sslFor } from "../api/_lib/ssl.ts";

const env = fileURLToPath(new URL("../.env", import.meta.url));
if (!process.env.DATABASE_URL && existsSync(env)) process.loadEnvFile(env);

export default {
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: sslFor(process.env.DATABASE_URL),
  },
  migrations: {
    directory: fileURLToPath(new URL("./migrations", import.meta.url)),
    loadExtensions: [".mjs"],
    tableName: "knex_migrations",
  },
};
