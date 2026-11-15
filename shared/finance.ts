/**
 * Regras de dinheiro e horas, usadas pela API e pelo app.
 * Valores sempre em centavos (inteiros) e tempo em segundos.
 */

export type Kind = "expense" | "income";

export interface Profile {
  name: string;
  hourly_rate_cents: number;
  salary_cents: number;
  hours_goal: number;
  timer_started_at: string | null;
}

export interface Category {
  id: string;
  kind: Kind;
  name: string;
  color: string;
  archived: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: "cash" | "debit" | "credit";
  closing_day: number | null;
  color: string;
  archived: boolean;
}

export interface MoneyFields {
  kind: Kind;
  category_id: string | null;
  account_id: string | null;
  description: string;
  amount_cents: number;
  person: string | null;
}

export interface Transaction extends MoneyFields {
  id: string;
  date: string;
  month: string;
  paid: boolean;
  group_id: string | null;
  installment: number | null;
  installments: number | null;
  recurrence_id: string | null;
}

export interface Recurrence extends MoneyFields {
  id: string;
  day: number;
  start_month: string;
  end_month: string | null;
}

export interface WorkEntry {
  id: string;
  date: string;
  month: string;
  seconds: number;
  rate_cents: number;
  note: string;
}

// ---------- Datas e meses ----------

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const isMonth = (v: unknown): v is string =>
  typeof v === "string" && MONTH.test(v);
export const isDate = (v: unknown): v is string =>
  typeof v === "string" && DATE.test(v);

export const monthOf = (date: string) => date.slice(0, 7);

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function todayISO(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * Mês em que o lançamento conta. No cartão de crédito, compras feitas no dia
 * do fechamento ou depois entram na fatura do mês seguinte.
 */
export function billingMonth(
  date: string,
  account?: Pick<Account, "type" | "closing_day"> | null,
): string {
  const month = monthOf(date);
  if (account?.type !== "credit" || !account.closing_day) return month;
  return Number(date.slice(8, 10)) >= account.closing_day
    ? addMonths(month, 1)
    : month;
}

/** Divide o total em parcelas; os centavos que sobram vão nas primeiras. */
export function splitInstallments(totalCents: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  const base = Math.floor(totalCents / n);
  const rest = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

export const recurrenceActive = (r: Recurrence, month: string) =>
  r.start_month <= month && (!r.end_month || r.end_month >= month);

/** Data da conta fixa no mês (dia 31 vira o último dia de meses curtos). */
export function recurrenceDate(r: Pick<Recurrence, "day">, month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(r.day, last)).padStart(2, "0")}`;
}

// ---------- Resumo do mês ----------

/** Linha exibida no mês: lançamento real ou conta fixa ainda não lançada. */
export type Entry = Transaction & { planned?: boolean };

export function monthEntries(
  month: string,
  transactions: Transaction[],
  recurrences: Recurrence[],
): Entry[] {
  const done = new Set(
    transactions.filter((t) => t.recurrence_id).map((t) => t.recurrence_id),
  );
  const planned: Entry[] = recurrences
    .filter((r) => recurrenceActive(r, month) && !done.has(r.id))
    .map((r) => ({
      id: `rec:${r.id}`,
      kind: r.kind,
      category_id: r.category_id,
      account_id: r.account_id,
      description: r.description,
      amount_cents: r.amount_cents,
      person: r.person,
      date: recurrenceDate(r, month),
      month,
      paid: false,
      group_id: null,
      installment: null,
      installments: null,
      recurrence_id: r.id,
      planned: true,
    }));
  return [...transactions, ...planned].sort(
    (a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description),
  );
}

/** Valor da hora: o informado ou, sem ele, o salário dividido pela meta de horas. */
export function hourValueCents(p: Profile): number {
  if (p.hourly_rate_cents > 0) return p.hourly_rate_cents;
  if (p.salary_cents > 0 && p.hours_goal > 0)
    return Math.round(p.salary_cents / p.hours_goal);
  return 0;
}

/** Valor de um registro de horas, em centavos. */
export const workValueCents = (w: Pick<WorkEntry, "seconds" | "rate_cents">) =>
  Math.round((w.seconds * w.rate_cents) / 3600);

export const workIncomeCents = (work: WorkEntry[]) =>
  Math.round(work.reduce((s, w) => s + (w.seconds * w.rate_cents) / 3600, 0));

export interface Summary {
  workedSeconds: number;
  goalSeconds: number;
  /** Quanto falta para a meta de horas (0 se já bateu). */
  missingSeconds: number;
  hoursIncome: number;
  salary: number;
  otherIncome: number;
  income: number;
  expenses: number;
  paidExpenses: number;
  balance: number;
  /** Se trabalhar a meta inteira no valor atual da hora. */
  projectedIncome: number;
  projectedBalance: number;
  byCategory: { id: string | null; name: string; color: string; cents: number }[];
  byAccount: { id: string | null; name: string; color: string; cents: number }[];
  /** Despesas com pessoa (devo) e receitas com pessoa (me devem) do mês. */
  iOwe: number;
  owedToMe: number;
}

export function summarize(
  profile: Profile,
  entries: Entry[],
  work: WorkEntry[],
  categories: Category[],
  accounts: Account[],
): Summary {
  const workedSeconds = work.reduce((s, w) => s + w.seconds, 0);
  const goalSeconds = profile.hours_goal * 3600;
  const hoursIncome = workIncomeCents(work);
  const salary = profile.salary_cents;
  const sum = (list: Entry[]) => list.reduce((s, e) => s + e.amount_cents, 0);
  const expenses = entries.filter((e) => e.kind === "expense");
  const incomes = entries.filter((e) => e.kind === "income");
  const otherIncome = sum(incomes);
  const income = salary + hoursIncome + otherIncome;
  const total = sum(expenses);
  const rate = profile.hourly_rate_cents;
  const missingSeconds = Math.max(0, goalSeconds - workedSeconds);
  const projectedIncome =
    income + (rate > 0 ? Math.round((missingSeconds * rate) / 3600) : 0);

  const group = <T extends { id: string; name: string; color: string }>(
    key: (e: Entry) => string | null,
    list: T[],
    empty: string,
  ) => {
    const map = new Map<string | null, number>();
    for (const e of expenses) map.set(key(e), (map.get(key(e)) ?? 0) + e.amount_cents);
    return [...map]
      .map(([id, cents]) => {
        const found = list.find((c) => c.id === id);
        return {
          id,
          name: found?.name ?? empty,
          color: found?.color ?? "#a1a1aa",
          cents,
        };
      })
      .sort((a, b) => b.cents - a.cents);
  };

  return {
    workedSeconds,
    goalSeconds,
    missingSeconds,
    hoursIncome,
    salary,
    otherIncome,
    income,
    expenses: total,
    paidExpenses: sum(expenses.filter((e) => e.paid)),
    balance: income - total,
    projectedIncome,
    projectedBalance: projectedIncome - total,
    byCategory: group((e) => e.category_id, categories, "Sem categoria"),
    byAccount: group((e) => e.account_id, accounts, "Sem conta"),
    iOwe: sum(expenses.filter((e) => e.person)),
    owedToMe: sum(incomes.filter((e) => e.person)),
  };
}

// ---------- Pessoas ----------

export interface PersonBalance {
  person: string;
  /** Positivo: a pessoa me deve. Negativo: eu devo a ela. */
  balance: number;
  open: number;
}

/** Saldo em aberto com cada pessoa (lançamentos ainda não pagos/recebidos). */
export function personBalances(open: Transaction[]): PersonBalance[] {
  const map = new Map<string, PersonBalance>();
  for (const t of open) {
    if (!t.person || t.paid) continue;
    const key = t.person.trim();
    const item = map.get(key.toLowerCase()) ?? { person: key, balance: 0, open: 0 };
    item.balance += t.kind === "income" ? t.amount_cents : -t.amount_cents;
    item.open += 1;
    map.set(key.toLowerCase(), item);
  }
  return [...map.values()].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

// ---------- Formatação ----------

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (cents: number) => BRL.format(cents / 100);

/** "1.234,56", "1234.56", "R$ 15" → centavos. Retorna null se inválido. */
export function parseMoney(text: string): number | null {
  let s = text.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export const centsToInput = (cents: number) =>
  cents ? (cents / 100).toFixed(2).replace(".", ",") : "";

/** 269748 → "74:55:48" (como na planilha). */
export function hms(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** "74:55:48", "7:30", "7,5", "7h30" → segundos. */
export function parseDuration(text: string): number | null {
  const s = text.trim().toLowerCase().replace(/\s/g, "");
  if (!s) return null;
  let m = s.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  m = s.match(/^(\d+)h(?:([0-5]?\d)(?:m(?:in)?)?)?$/);
  if (m) return Number(m[1]) * 3600 + Number(m[2] ?? 0) * 60;
  m = s.match(/^(\d+)(?:[.,](\d+))?$/);
  if (m) return Math.round(Number(`${m[1]}.${m[2] ?? 0}`) * 3600);
  return null;
}

/** Quanto tempo de trabalho custa um valor. */
export function hoursFor(cents: number, hourCents: number): string | null {
  if (hourCents <= 0) return null;
  const s = Math.round((cents / hourCents) * 3600);
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h === 0) return `${Math.max(1, m)} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const monthLabel = (month: string) =>
  `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

/** Categorias criadas na primeira entrada (a pessoa pode editar e criar quantas quiser). */
export const DEFAULT_CATEGORIES: { kind: Kind; name: string; color: string }[] = [
  { kind: "expense", name: "Casa", color: "#ea580c" },
  { kind: "expense", name: "Mercado", color: "#ca8a04" },
  { kind: "expense", name: "Assinaturas", color: "#2563eb" },
  { kind: "expense", name: "Fast food", color: "#db2777" },
  { kind: "expense", name: "Jogos", color: "#16a34a" },
  { kind: "expense", name: "Pets", color: "#0d9488" },
  { kind: "expense", name: "Presentes", color: "#9333ea" },
  { kind: "expense", name: "Outros", color: "#71717a" },
  { kind: "income", name: "Extra", color: "#16a34a" },
  { kind: "income", name: "Reembolso", color: "#0d9488" },
];
export const DEFAULT_ACCOUNTS: Pick<Account, "name" | "type" | "closing_day" | "color">[] = [
  { name: "Pix / débito", type: "debit", closing_day: null, color: "#0f7a4a" },
  { name: "Cartão de crédito", type: "credit", closing_day: null, color: "#7c3aed" },
];
