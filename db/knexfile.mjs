// Migrações rodam direto no Postgres do Supabase (veja README).
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const env = fileURLToPath(new URL("../.env", import.meta.url));
if (!process.env.DATABASE_URL && existsSync(env)) process.loadEnvFile(env);

export default {
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    // Supabase exige SSL; o Postgres local de testes não usa.
    ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "") ? false : { rejectUnauthorized: false },
  },
  migrations: {
    directory: fileURLToPath(new URL("./migrations", import.meta.url)),
    loadExtensions: [".mjs"],
    tableName: "knex_migrations",
  },
};
