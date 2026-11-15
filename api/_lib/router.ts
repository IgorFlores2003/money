import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { db } from "./db.js";
import { forgetUser, userFromToken, type AuthUser } from "./auth.js";
import {
  addMonths,
  billingMonth,
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  isDate,
  isMonth,
  monthOf,
  splitInstallments,
  todayISO,
  type Account,
} from "../../shared/finance.js";

export interface ApiRequest {
  method: string;
  /** Caminho depois de /api, ex.: "transactions/123". */
  path: string;
  query: Record<string, string | undefined>;
  body: unknown;
  token: string;
}
export interface ApiResponse {
  status: number;
  body: unknown;
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const bad = (message: string) => new HttpError(400, message);
const notFound = () => new HttpError(404, "Não encontrado.");

// ---------- Validação ----------

type Body = Record<string, unknown>;
const obj = (v: unknown): Body =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Body) : {};

function text(b: Body, key: string, label: string, max = 120, required = true) {
  const v = b[key];
  if (v == null || v === "") {
    if (required) throw bad(`Informe ${label}.`);
    return null;
  }
  if (typeof v !== "string") throw bad(`${label} inválido.`);
  const s = v.trim();
  if (required && !s) throw bad(`Informe ${label}.`);
  if (s.length > max) throw bad(`${label} muito longo (máx. ${max}).`);
  return s || null;
}
function int(b: Body, key: string, label: string, min: number, max: number) {
  const v = b[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max)
    throw bad(`${label} inválido.`);
  return v;
}
function optInt(b: Body, key: string, label: string, min: number, max: number) {
  return b[key] == null || b[key] === "" ? null : int(b, key, label, min, max);
}
function oneOf<T extends string>(b: Body, key: string, options: readonly T[], label: string): T {
  const v = b[key];
  if (!options.includes(v as T)) throw bad(`${label} inválido.`);
  return v as T;
}
const color = (b: Body) => {
  const v = b.color ?? "#71717a";
  if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) throw bad("Cor inválida.");
  return v;
};
const uuid = (v: unknown) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const MAX_CENTS = 2_000_000_000;

/** Garante que categoria e conta são da própria pessoa. */
async function ownedRefs(k: Knex, userId: string, b: Body) {
  const category_id = b.category_id || null;
  const account_id = b.account_id || null;
  let account: Account | null = null;
  if (category_id) {
    if (!uuid(category_id)) throw bad("Categoria inválida.");
    const c = await k("categories").where({ id: category_id, user_id: userId }).first();
    if (!c) throw bad("Categoria inválida.");
    if (c.kind !== b.kind) throw bad("A categoria não é deste tipo.");
  }
  if (account_id) {
    if (!uuid(account_id)) throw bad("Conta inválida.");
    account = await k("accounts").where({ id: account_id, user_id: userId }).first();
    if (!account) throw bad("Conta inválida.");
  }
  return { category_id: category_id as string | null, account_id: account_id as string | null, account };
}

async function moneyFields(k: Knex, userId: string, b: Body) {
  const kind = oneOf(b, "kind", ["expense", "income"] as const, "Tipo");
  const refs = await ownedRefs(k, userId, { ...b, kind });
  return {
    kind,
    category_id: refs.category_id,
    account_id: refs.account_id,
    description: text(b, "description", "a descrição")!,
    amount_cents: int(b, "amount_cents", "Valor", 1, MAX_CENTS),
    person: text(b, "person", "Pessoa", 60, false),
    account: refs.account,
  };
}

// ---------- Perfil ----------

const PROFILE_COLUMNS = [
  "name",
  "hourly_rate_cents",
  "salary_cents",
  "hours_goal",
  "timer_started_at",
];

/** Primeira entrada: cria perfil, categorias e contas padrão. */
async function ensureProfile(user: AuthUser) {
  const k = db();
  const found = await k("profiles").where({ user_id: user.id }).first(PROFILE_COLUMNS);
  if (found) return found;
  await k.transaction(async (trx) => {
    const inserted = await trx("profiles")
      .insert({ user_id: user.id, name: user.name })
      .onConflict("user_id")
      .ignore()
      .returning("user_id");
    if (!inserted.length) return;
    await trx("categories")
      .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id })))
      .onConflict(["user_id", "kind", "name"])
      .ignore();
    await trx("accounts")
      .insert(DEFAULT_ACCOUNTS.map((a) => ({ ...a, user_id: user.id })))
      .onConflict(["user_id", "name"])
      .ignore();
  });
  return k("profiles").where({ user_id: user.id }).first(PROFILE_COLUMNS);
}

// ---------- Rotas ----------

type Handler = (ctx: {
  user: AuthUser;
  k: Knex;
  body: Body;
  query: ApiRequest["query"];
  id?: string;
}) => Promise<unknown>;

const TX_COLUMNS = [
  "id", "kind", "category_id", "account_id", "description", "amount_cents",
  "person", "date", "month", "paid", "group_id", "installment", "installments",
  "recurrence_id",
];
const REC_COLUMNS = [
  "id", "kind", "category_id", "account_id", "description", "amount_cents",
  "person", "day", "start_month", "end_month",
];
const WORK_COLUMNS = ["id", "date", "month", "seconds", "rate_cents", "note"];

const routes: Record<string, Handler> = {
  "GET me": async ({ user }) => ({ ...(await ensureProfile(user)), email: user.email }),

  "PUT me": async ({ user, k, body }) => {
    await ensureProfile(user);
    const patch = {
      name: text(body, "name", "o nome", 60, false) ?? "",
      hourly_rate_cents: int(body, "hourly_rate_cents", "Valor da hora", 0, MAX_CENTS),
      salary_cents: int(body, "salary_cents", "Salário", 0, MAX_CENTS),
      hours_goal: int(body, "hours_goal", "Meta de horas", 0, 744),
      updated_at: k.fn.now(),
    };
    const [row] = await k("profiles").where({ user_id: user.id }).update(patch).returning(PROFILE_COLUMNS);
    return row;
  },

  /**
   * Exclui a conta de vez (exigência do Google Play). Apagar o usuário do
   * Supabase Auth leva junto, em cascata, perfil, categorias, contas,
   * lançamentos, contas fixas e horas.
   */
  "POST me/delete": async ({ user, k, body }) => {
    if (body.confirm !== "EXCLUIR") throw bad("Digite EXCLUIR para confirmar.");
    await k.raw("delete from auth.users where id = ?", [user.id]);
    forgetUser(user.id);
    return { ok: true };
  },

  // ----- Categorias (infinitas, de despesa e de receita) -----
  "GET categories": ({ user, k }) =>
    k("categories").where({ user_id: user.id }).orderBy(["kind", "name"])
      .select("id", "kind", "name", "color", "archived"),

  "POST categories": async ({ user, k, body }) => {
    const row = {
      user_id: user.id,
      kind: oneOf(body, "kind", ["expense", "income"] as const, "Tipo"),
      name: text(body, "name", "o nome", 40)!,
      color: color(body),
    };
    const [created] = await k("categories").insert(row)
      .onConflict(["user_id", "kind", "name"]).ignore()
      .returning(["id", "kind", "name", "color", "archived"]);
    if (!created) throw bad("Já existe uma categoria com esse nome.");
    return created;
  },

  "PUT categories/:id": async ({ user, k, body, id }) => {
    const [row] = await k("categories").where({ id, user_id: user.id })
      .update({ name: text(body, "name", "o nome", 40)!, color: color(body), archived: Boolean(body.archived) })
      .returning(["id", "kind", "name", "color", "archived"])
      .catch((e) => {
        if (e.code === "23505") throw bad("Já existe uma categoria com esse nome.");
        throw e;
      });
    if (!row) throw notFound();
    return row;
  },

  "DELETE categories/:id": async ({ user, k, id }) => {
    // Lançamentos ficam "Sem categoria" (on delete set null).
    const n = await k("categories").where({ id, user_id: user.id }).delete();
    if (!n) throw notFound();
    return { ok: true };
  },

  // ----- Contas e cartões -----
  "GET accounts": ({ user, k }) =>
    k("accounts").where({ user_id: user.id }).orderBy("name")
      .select("id", "name", "type", "closing_day", "color", "archived"),

  "POST accounts": async ({ user, k, body }) => {
    const [created] = await k("accounts").insert({ user_id: user.id, ...accountFields(body) })
      .onConflict(["user_id", "name"]).ignore()
      .returning(["id", "name", "type", "closing_day", "color", "archived"]);
    if (!created) throw bad("Já existe uma conta com esse nome.");
    return created;
  },

  "PUT accounts/:id": async ({ user, k, body, id }) => {
    const [row] = await k("accounts").where({ id, user_id: user.id })
      .update({ ...accountFields(body), archived: Boolean(body.archived) })
      .returning(["id", "name", "type", "closing_day", "color", "archived"])
      .catch((e) => {
        if (e.code === "23505") throw bad("Já existe uma conta com esse nome.");
        throw e;
      });
    if (!row) throw notFound();
    return row;
  },

  "DELETE accounts/:id": async ({ user, k, id }) => {
    const n = await k("accounts").where({ id, user_id: user.id }).delete();
    if (!n) throw notFound();
    return { ok: true };
  },

  // ----- Mês -----
  "GET month": async ({ user, k, query }) => {
    const month = query.m;
    if (!isMonth(month)) throw bad("Mês inválido.");
    const [transactions, recurrences, work] = await Promise.all([
      k("transactions").where({ user_id: user.id, month }).select(TX_COLUMNS),
      k("recurrences").where({ user_id: user.id })
        .where("start_month", "<=", month)
        .where((q) => q.whereNull("end_month").orWhere("end_month", ">=", month))
        .select(REC_COLUMNS),
      k("work_entries").where({ user_id: user.id, month }).orderBy("date", "desc").select(WORK_COLUMNS),
    ]);
    return { month, transactions, recurrences, work };
  },

  /** Totais dos últimos meses (gráfico de evolução). */
  "GET history": async ({ user, k, query }) => {
    const to = query.to;
    if (!isMonth(to)) throw bad("Mês inválido.");
    const from = addMonths(to, -5);
    const [tx, work] = await Promise.all([
      k("transactions").where({ user_id: user.id }).whereBetween("month", [from, to])
        .groupBy("month", "kind").select("month", "kind").sum({ cents: "amount_cents" }),
      k("work_entries").where({ user_id: user.id }).whereBetween("month", [from, to])
        .groupBy("month").select("month")
        .sum({ cents: k.raw("round(seconds * rate_cents / 3600.0)") }),
    ]);
    return { from, to, transactions: tx, work };
  },

  // ----- Lançamentos -----
  "POST transactions": async ({ user, k, body }) => {
    const { account, ...fields } = await moneyFields(k, user.id, body);
    const date = isDate(body.date) ? body.date : todayISO();
    const firstMonth = isMonth(body.month) ? body.month : billingMonth(date, account);
    const paid = Boolean(body.paid);
    const recurrence_id = body.recurrence_id || null;
    if (recurrence_id) {
      if (!uuid(recurrence_id)) throw bad("Conta fixa inválida.");
      const r = await k("recurrences").where({ id: recurrence_id, user_id: user.id }).first();
      if (!r) throw bad("Conta fixa inválida.");
    }
    const count = optInt(body, "installments", "Parcelas", 1, 120) ?? 1;
    // Compra já em andamento ("MAC 8/12"): começa da parcela informada.
    const start = optInt(body, "first_installment", "Parcela inicial", 1, count) ?? 1;
    if (count === 1) {
      const [row] = await k("transactions")
        .insert({ ...fields, user_id: user.id, date, month: firstMonth, paid, recurrence_id })
        .returning(TX_COLUMNS);
      return [row];
    }
    // O valor informado é o da parcela ou o total, conforme a pessoa escolheu.
    const parts = body.amount_is_total
      ? splitInstallments(fields.amount_cents, count)
      : Array(count).fill(fields.amount_cents);
    const group_id = randomUUID();
    const rows = [];
    for (let i = start; i <= count; i++)
      rows.push({
        ...fields,
        user_id: user.id,
        amount_cents: parts[i - 1],
        date,
        month: addMonths(firstMonth, i - start),
        paid: i === start ? paid : false,
        group_id,
        installment: i,
        installments: count,
      });
    return k("transactions").insert(rows).returning(TX_COLUMNS);
  },

  "PUT transactions/:id": async ({ user, k, body, id }) => {
    const current = await k("transactions").where({ id, user_id: user.id }).first();
    if (!current) throw notFound();
    // Atalho para marcar como pago sem reenviar tudo.
    if (Object.keys(body).length === 1 && "paid" in body) {
      const [row] = await k("transactions").where({ id, user_id: user.id })
        .update({ paid: Boolean(body.paid), updated_at: k.fn.now() }).returning(TX_COLUMNS);
      return row;
    }
    const { account: _a, ...fields } = await moneyFields(k, user.id, body);
    const date = isDate(body.date) ? body.date : current.date;
    const month = isMonth(body.month) ? body.month : current.month;
    const patch = { ...fields, date, month, paid: Boolean(body.paid), updated_at: k.fn.now() };
    // Parcelado: descrição, categoria, conta e pessoa valem para todas as parcelas.
    if (current.group_id && body.apply_to_group) {
      const { amount_cents: _x, ...shared } = fields;
      await k("transactions").where({ user_id: user.id, group_id: current.group_id })
        .update({ ...shared, updated_at: k.fn.now() });
    }
    const [row] = await k("transactions").where({ id, user_id: user.id }).update(patch).returning(TX_COLUMNS);
    return row;
  },

  "DELETE transactions/:id": async ({ user, k, id, query }) => {
    const current = await k("transactions").where({ id, user_id: user.id }).first();
    if (!current) throw notFound();
    const q = k("transactions").where({ user_id: user.id });
    // ?scope=group apaga todas as parcelas; ?scope=next, esta e as seguintes.
    if (current.group_id && query.scope === "group") q.where({ group_id: current.group_id });
    else if (current.group_id && query.scope === "next")
      q.where({ group_id: current.group_id }).where("installment", ">=", current.installment);
    else q.where({ id });
    return { deleted: await q.delete() };
  },

  /** Quem me deve e a quem devo (tudo em aberto, de qualquer mês). */
  "GET people": ({ user, k }) =>
    k("transactions").where({ user_id: user.id, paid: false }).whereNotNull("person")
      .orderBy("date", "desc").select(TX_COLUMNS),

  /** Quita tudo em aberto com uma pessoa. */
  "POST people/settle": async ({ user, k, body }) => {
    const person = text(body, "person", "a pessoa", 60)!;
    const n = await k("transactions").where({ user_id: user.id, paid: false })
      .whereRaw("lower(trim(person)) = lower(?)", [person])
      .update({ paid: true, updated_at: k.fn.now() });
    return { updated: n };
  },

  // ----- Contas fixas (todo mês) -----
  "GET recurrences": ({ user, k }) =>
    k("recurrences").where({ user_id: user.id }).orderBy("description").select(REC_COLUMNS),

  "POST recurrences": async ({ user, k, body }) => {
    const [row] = await k("recurrences")
      .insert({ ...(await recurrenceFields(k, user.id, body)), user_id: user.id })
      .returning(REC_COLUMNS);
    return row;
  },

  "PUT recurrences/:id": async ({ user, k, body, id }) => {
    const [row] = await k("recurrences").where({ id, user_id: user.id })
      .update(await recurrenceFields(k, user.id, body)).returning(REC_COLUMNS);
    if (!row) throw notFound();
    return row;
  },

  "DELETE recurrences/:id": async ({ user, k, id }) => {
    const n = await k("recurrences").where({ id, user_id: user.id }).delete();
    if (!n) throw notFound();
    return { ok: true };
  },

  // ----- Horas de serviço -----
  "POST work": async ({ user, k, body }) => {
    const profile = await ensureProfile(user);
    const row = workFields(body, profile.hourly_rate_cents);
    const [created] = await k("work_entries").insert({ ...row, user_id: user.id }).returning(WORK_COLUMNS);
    return created;
  },

  "PUT work/:id": async ({ user, k, body, id }) => {
    const current = await k("work_entries").where({ id, user_id: user.id }).first();
    if (!current) throw notFound();
    const [row] = await k("work_entries").where({ id, user_id: user.id })
      .update(workFields(body, current.rate_cents)).returning(WORK_COLUMNS);
    return row;
  },

  "DELETE work/:id": async ({ user, k, id }) => {
    const n = await k("work_entries").where({ id, user_id: user.id }).delete();
    if (!n) throw notFound();
    return { ok: true };
  },

  /** Cronômetro guardado na conta: começa num aparelho, termina em outro. */
  "POST timer/start": async ({ user, k }) => {
    await ensureProfile(user);
    const [row] = await k("profiles").where({ user_id: user.id })
      .update({ timer_started_at: k.raw("coalesce(timer_started_at, now())") })
      .returning(PROFILE_COLUMNS);
    return row;
  },

  "POST timer/stop": async ({ user, k, body }) => {
    const profile = await ensureProfile(user);
    if (!profile.timer_started_at) throw bad("O cronômetro não está ligado.");
    const started = new Date(profile.timer_started_at);
    const seconds = Math.round((Date.now() - started.getTime()) / 1000);
    let entry = null;
    if (seconds >= 60 && !body.discard) {
      const date = isDate(body.date) ? body.date : todayISO(started);
      [entry] = await k("work_entries").insert({
        user_id: user.id,
        date,
        month: monthOf(date),
        seconds,
        rate_cents: profile.hourly_rate_cents,
        note: text(body, "note", "Observação", 120, false) ?? "",
      }).returning(WORK_COLUMNS);
    }
    const [row] = await k("profiles").where({ user_id: user.id })
      .update({ timer_started_at: null }).returning(PROFILE_COLUMNS);
    return { profile: row, entry };
  },
};

function accountFields(b: Body) {
  const type = oneOf(b, "type", ["cash", "debit", "credit"] as const, "Tipo de conta");
  return {
    name: text(b, "name", "o nome", 40)!,
    type,
    closing_day: type === "credit" ? optInt(b, "closing_day", "Dia de fechamento", 1, 31) : null,
    color: color(b),
  };
}

async function recurrenceFields(k: Knex, userId: string, b: Body) {
  const { account: _a, ...fields } = await moneyFields(k, userId, b);
  if (!isMonth(b.start_month)) throw bad("Mês de início inválido.");
  const end = b.end_month || null;
  if (end && (!isMonth(end) || end < b.start_month)) throw bad("Mês final inválido.");
  return {
    ...fields,
    day: int(b, "day", "Dia", 1, 31),
    start_month: b.start_month,
    end_month: end,
  };
}

function workFields(b: Body, defaultRate: number) {
  if (!isDate(b.date)) throw bad("Data inválida.");
  return {
    date: b.date,
    month: monthOf(b.date),
    seconds: int(b, "seconds", "Duração", 1, 31 * 24 * 3600),
    rate_cents: b.rate_cents == null ? defaultRate : int(b, "rate_cents", "Valor da hora", 0, MAX_CENTS),
    note: text(b, "note", "Observação", 120, false) ?? "",
  };
}

// ---------- Entrada ----------

export async function handle(req: ApiRequest): Promise<ApiResponse> {
  try {
    const parts = req.path.split("/").filter(Boolean);
    let id: string | undefined;
    let key = `${req.method} ${parts.join("/")}`;
    if (!routes[key] && parts.length === 2) {
      id = parts[1];
      key = `${req.method} ${parts[0]}/:id`;
      if (!uuid(id)) throw notFound();
    }
    const route = routes[key];
    if (!route) throw notFound();
    const user = await userFromToken(req.token);
    if (!user) throw new HttpError(401, "Entre novamente na sua conta.");
    const body = await route({ user, k: db(), body: obj(req.body), query: req.query, id });
    return { status: 200, body };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
    console.error(e);
    return { status: 500, body: { error: "Erro no servidor. Tente novamente." } };
  }
}
