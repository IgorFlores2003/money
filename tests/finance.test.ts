import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths, billingMonth, hms, hoursFor, monthEntries, parseDuration, parseMoney,
  personBalances, splitInstallments, summarize, recurrenceDate,
  type Profile, type Recurrence, type Transaction, type WorkEntry,
} from "../shared/finance.ts";

const profile: Profile = { name: "", hourly_rate_cents: 1500, salary_cents: 0, hours_goal: 80, timer_started_at: null };
const tx = (o: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(), kind: "expense", category_id: null, account_id: null, description: "x",
  amount_cents: 100, person: null, date: "2026-11-10", month: "2026-11", paid: false,
  group_id: null, installment: null, installments: null, recurrence_id: null, ...o,
});

test("meses", () => {
  assert.equal(addMonths("2026-11", 2), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-12", 12), "2027-12");
});

test("fatura do cartão respeita o dia de fechamento", () => {
  const card = { type: "credit" as const, closing_day: 5 };
  assert.equal(billingMonth("2026-11-04", card), "2026-11");
  assert.equal(billingMonth("2026-11-05", card), "2026-12");
  assert.equal(billingMonth("2026-12-20", card), "2027-01");
  assert.equal(billingMonth("2026-11-20", { type: "debit", closing_day: null }), "2026-11");
});

test("parcelas não perdem centavos", () => {
  assert.deepEqual(splitInstallments(1000, 3), [334, 333, 333]);
  assert.equal(splitInstallments(68600, 12).reduce((a, b) => a + b), 68600);
});

test("dinheiro e duração em formato brasileiro", () => {
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("R$ 15"), 1500);
  assert.equal(parseMoney("52,15"), 5215);
  assert.equal(parseMoney("9.90"), 990);
  assert.equal(parseMoney("2.743"), 274300);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseDuration("74:55:48"), 269748);
  assert.equal(parseDuration("7h30"), 27000);
  assert.equal(parseDuration("7,5"), 27000);
  assert.equal(hms(269748), "74:55:48");
});

test("planilha de novembro: 74:55:48 a R$ 15/h", () => {
  const work: WorkEntry[] = [{ id: "w", date: "2026-11-01", month: "2026-11", seconds: 269748, rate_cents: 1500, note: "" }];
  const entries = monthEntries("2026-11", [tx({ amount_cents: 259308 })], []);
  const s = summarize(profile, entries, work, [], []);
  assert.equal(s.hoursIncome, 112395); // R$ 1.123,95
  assert.equal(s.balance, 112395 - 259308); // -R$ 1.469,13
  assert.equal(hms(s.missingSeconds), "05:04:12");
  assert.equal(s.projectedIncome, 120000); // 80h × 15
});

test("conta fixa aparece prevista até ser lançada no mês", () => {
  const rec: Recurrence = { id: "r1", kind: "expense", category_id: null, account_id: null, description: "Netflix",
    amount_cents: 3990, person: null, day: 31, start_month: "2026-10", end_month: "2027-01" };
  const planned = monthEntries("2026-11", [], [rec]);
  assert.equal(planned.length, 1);
  assert.equal(planned[0].planned, true);
  assert.equal(planned[0].date, "2026-11-30");
  assert.equal(monthEntries("2026-11", [tx({ recurrence_id: "r1" })], [rec]).length, 1);
  assert.equal(monthEntries("2027-02", [], [rec]).length, 0);
  assert.equal(recurrenceDate({ day: 31 }, "2027-02"), "2027-02-28");
});

test("saldo por pessoa", () => {
  const list = personBalances([
    tx({ person: "Yasmim", amount_cents: 6000 }),
    tx({ person: "yasmim ", kind: "income", amount_cents: 7500 }),
    tx({ person: "Ana", amount_cents: 100, paid: true }),
  ]);
  assert.deepEqual(list, [{ person: "Yasmim", balance: 1500, open: 2 }]);
});

test("custo em horas", () => {
  assert.equal(hoursFor(6000, 1500), "4h");
  assert.equal(hoursFor(2250, 1500), "1h30");
  assert.equal(hoursFor(100, 1500), "4 min");
});
