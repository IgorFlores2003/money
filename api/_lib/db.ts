import knex, { type Knex } from "knex";
import pg from "pg";

// integer/bigint/numeric chegam como número (valores em centavos cabem em int).
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1700, (v) => Number(v));
// date fica como texto "AAAA-MM-DD" (sem fuso horário mudando o dia).
pg.types.setTypeParser(1082, (v) => v);

let instance: Knex | null = null;

/**
 * Uma conexão por instância da função. Use a URL do "Transaction pooler"
 * do Supabase (porta 6543), feita para ambientes serverless.
 */
export function db(): Knex {
  if (instance) return instance;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
  instance = knex({
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      // Supabase exige SSL; o Postgres local de testes não usa.
      ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "") ? false : { rejectUnauthorized: false },
    },
    pool: { min: 0, max: Number(process.env.DB_POOL_MAX) || 3, idleTimeoutMillis: 10_000 },
  });
  return instance;
}
