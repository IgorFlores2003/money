/**
 * Esquema inicial. Valores em centavos (inteiro) e tempo em segundos, para
 * nunca perder centavos com ponto flutuante. Meses no formato "AAAA-MM".
 *
 * A API acessa o banco pelo Knex (papel postgres) e sempre filtra por
 * user_id. O RLS fica ligado SEM políticas: assim ninguém lê ou grava estas
 * tabelas pela API pública do Supabase com a chave anônima.
 */
const TABLES = [
  "profiles",
  "categories",
  "accounts",
  "recurrences",
  "transactions",
  "work_entries",
];

export async function up(knex) {
  const owner = (t) =>
    t
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("CASCADE");
  const id = (t) => t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
  const month = (t, name) => t.string(name, 7);

  await knex.schema.createTable("profiles", (t) => {
    t.uuid("user_id").primary().references("id").inTable("auth.users").onDelete("CASCADE");
    t.text("name").notNullable().defaultTo("");
    t.integer("hourly_rate_cents").notNullable().defaultTo(0);
    t.integer("salary_cents").notNullable().defaultTo(0);
    t.integer("hours_goal").notNullable().defaultTo(80);
    t.timestamp("timer_started_at", { useTz: true });
    t.timestamps(true, true);
  });

  await knex.schema.createTable("categories", (t) => {
    id(t);
    owner(t);
    t.enu("kind", ["expense", "income"]).notNullable();
    t.text("name").notNullable();
    t.string("color", 7).notNullable().defaultTo("#71717a");
    t.boolean("archived").notNullable().defaultTo(false);
    t.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    t.unique(["user_id", "kind", "name"]);
  });

  await knex.schema.createTable("accounts", (t) => {
    id(t);
    owner(t);
    t.text("name").notNullable();
    t.enu("type", ["cash", "debit", "credit"]).notNullable().defaultTo("debit");
    // Cartão: compras a partir deste dia caem na fatura do mês seguinte.
    t.integer("closing_day");
    t.string("color", 7).notNullable().defaultTo("#71717a");
    t.boolean("archived").notNullable().defaultTo(false);
    t.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    t.unique(["user_id", "name"]);
  });

  const money = (t) => {
    t.enu("kind", ["expense", "income"]).notNullable();
    t.uuid("category_id").references("id").inTable("categories").onDelete("SET NULL");
    t.uuid("account_id").references("id").inTable("accounts").onDelete("SET NULL");
    t.text("description").notNullable();
    t.integer("amount_cents").notNullable();
    // Despesa com pessoa = devo a ela; receita com pessoa = ela me deve.
    t.text("person");
  };

  await knex.schema.createTable("recurrences", (t) => {
    id(t);
    owner(t);
    money(t);
    t.integer("day").notNullable().defaultTo(1);
    month(t, "start_month").notNullable();
    month(t, "end_month");
    t.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("transactions", (t) => {
    id(t);
    owner(t);
    money(t);
    t.date("date").notNullable();
    month(t, "month").notNullable();
    t.boolean("paid").notNullable().defaultTo(false);
    t.uuid("group_id");
    t.integer("installment");
    t.integer("installments");
    t.uuid("recurrence_id").references("id").inTable("recurrences").onDelete("SET NULL");
    t.timestamps(true, true);
    t.index(["user_id", "month"]);
    t.index(["user_id", "group_id"]);
    t.index(["user_id", "person"]);
  });

  await knex.schema.createTable("work_entries", (t) => {
    id(t);
    owner(t);
    t.date("date").notNullable();
    month(t, "month").notNullable();
    t.integer("seconds").notNullable();
    t.integer("rate_cents").notNullable();
    t.text("note").notNullable().defaultTo("");
    t.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    t.index(["user_id", "month"]);
  });

  await knex.raw(`
    alter table transactions add constraint transactions_amount_positive check (amount_cents > 0);
    alter table recurrences add constraint recurrences_amount_positive check (amount_cents > 0);
    alter table recurrences add constraint recurrences_day check (day between 1 and 31);
    alter table accounts add constraint accounts_closing_day check (closing_day is null or closing_day between 1 and 31);
    alter table work_entries add constraint work_seconds_positive check (seconds > 0);
    alter table profiles add constraint profiles_values check (hourly_rate_cents >= 0 and salary_cents >= 0 and hours_goal between 0 and 744);
  `);
  for (const table of TABLES)
    await knex.raw(`alter table ?? enable row level security`, [table]);
}

export async function down(knex) {
  for (const table of [...TABLES].reverse())
    await knex.schema.dropTableIfExists(table);
}
