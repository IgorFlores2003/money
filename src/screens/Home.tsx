import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../App";
import { api } from "../api";
import { addMonths, brl, hms, hourValueCents, hoursFor, MONTH_NAMES } from "../../shared/finance";
import { Dot, MonthPicker, Spinner } from "../ui";

type History = {
  transactions: { month: string; kind: "expense" | "income"; cents: number }[];
  work: { month: string; cents: number }[];
};

export default function Home() {
  const { profile, month, setMonth, summary: s, loadingMonth, entries, go } = useStore();
  const [history, setHistory] = useState<History | null>(null);
  useEffect(() => {
    let alive = true;
    api<History>(`history?to=${month}`).then((h) => alive && setHistory(h)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [month, entries.length]);

  const hourCents = hourValueCents(profile);
  const progress = s.goalSeconds ? Math.min(1, s.workedSeconds / s.goalSeconds) : 0;
  const pending = entries.filter((e) => e.kind === "expense" && !e.paid);
  const first = profile.name.split(" ")[0];
  const noIncomeSetup = !profile.salary_cents && !profile.hourly_rate_cents;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{first ? `Olá, ${first}` : "Resumo"}</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      {noIncomeSetup && (
        <p className="rounded-xl bg-warn-50 p-3 text-sm text-warn-800">
          Informe seu salário ou quanto ganha por hora em <button className="font-semibold underline" onClick={() => go("settings")}>Ajustes</button> para calcular sua receita.
        </p>
      )}

      {loadingMonth ? (
        <Spinner />
      ) : (
        <>
          <section className="card">
            <p className="text-sm font-medium text-ink-500">Sobra do mês</p>
            <p className={`mt-1 text-4xl font-bold tabular-nums ${s.balance < 0 ? "text-neg" : "text-pos"}`}>
              {brl(s.balance)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm text-ink-500">
                  <Dot color="var(--color-pos)" /> Receita
                </p>
                <p className="text-lg font-semibold tabular-nums">{brl(s.income)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm text-ink-500">
                  <Dot color="var(--color-neg)" /> Despesas
                </p>
                <p className="text-lg font-semibold tabular-nums">{brl(s.expenses)}</p>
              </div>
            </div>
            {s.income + s.expenses > 0 && (
              <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                <div className="rounded-l-full bg-pos" style={{ flex: s.income }} />
                <div className="rounded-r-full bg-neg" style={{ flex: s.expenses }} />
              </div>
            )}
            {s.missingSeconds > 0 && profile.hourly_rate_cents > 0 && (
              <p className="mt-4 rounded-xl bg-page p-3 text-sm text-ink-700">
                Completando a meta de {profile.hours_goal}h (faltam {hms(s.missingSeconds)}), a sobra vai para{" "}
                <strong className={s.projectedBalance < 0 ? "text-neg" : "text-pos"}>{brl(s.projectedBalance)}</strong>.
              </p>
            )}
            {s.balance < 0 && hourCents > 0 && (
              <p className="mt-2 text-sm text-ink-500">
                Para zerar faltam {hoursFor(-s.balance, hourCents)} de trabalho.
              </p>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <section className="card">
              <h2 className="font-semibold">Horas de serviço</h2>
              <p className="mt-2 text-3xl font-bold tabular-nums">{hms(s.workedSeconds)}</p>
              <p className="text-sm text-ink-500">
                de {profile.hours_goal}h · {s.missingSeconds ? `faltam ${hms(s.missingSeconds)}` : "meta batida 🎉"}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-page" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress * 100}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-ink-500">Valor da hora</dt>
                <dd className="text-right tabular-nums">{brl(profile.hourly_rate_cents)}</dd>
                <dt className="text-ink-500">Ganho com horas</dt>
                <dd className="text-right font-semibold tabular-nums">{brl(s.hoursIncome)}</dd>
                {s.salary > 0 && (
                  <>
                    <dt className="text-ink-500">Salário</dt>
                    <dd className="text-right tabular-nums">{brl(s.salary)}</dd>
                  </>
                )}
                {s.otherIncome > 0 && (
                  <>
                    <dt className="text-ink-500">Outras receitas</dt>
                    <dd className="text-right tabular-nums">{brl(s.otherIncome)}</dd>
                  </>
                )}
              </dl>
            </section>

            <section className="card">
              <h2 className="font-semibold">Despesas por categoria</h2>
              {s.byCategory.length === 0 ? (
                <p className="mt-6 text-center text-sm text-ink-500">Nenhuma despesa neste mês.</p>
              ) : (
                <div className="mt-2 flex items-center gap-4">
                  <div className="size-28 shrink-0 sm:size-32">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={s.byCategory} dataKey="cents" nameKey="name" innerRadius="58%" outerRadius="100%" stroke="var(--color-card)" strokeWidth={2} isAnimationActive={false}>
                          {s.byCategory.map((c) => (
                            <Cell key={c.id ?? "none"} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => brl(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                    {s.byCategory.slice(0, 6).map((c) => (
                      <li key={c.id ?? "none"} className="flex items-center gap-2">
                        <Dot color={c.color} />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="hidden text-ink-500 tabular-nums sm:inline">{Math.round((c.cents / s.expenses) * 100)}%</span>
                        <span className="text-right font-medium tabular-nums">{brl(c.cents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="card">
              <h2 className="font-semibold">Por conta e cartão</h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {s.byAccount.length === 0 && <li className="text-ink-500">Nada lançado.</li>}
                {s.byAccount.map((a) => (
                  <li key={a.id ?? "none"} className="flex items-center gap-2">
                    <Dot color={a.color} />
                    <span className="flex-1">{a.name}</span>
                    <span className="font-medium tabular-nums">{brl(a.cents)}</span>
                  </li>
                ))}
              </ul>
              {pending.length > 0 && (
                <p className="mt-4 border-t border-line pt-3 text-sm text-ink-500">
                  {pending.length} despesa(s) ainda não paga(s): {brl(pending.reduce((t, e) => t + e.amount_cents, 0))}
                </p>
              )}
            </section>

            <section className="card">
              <h2 className="font-semibold">Pessoas neste mês</h2>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-ink-500">Eu devo</dt>
                <dd className="text-right font-semibold text-neg tabular-nums">{brl(s.iOwe)}</dd>
                <dt className="text-ink-500">Me devem</dt>
                <dd className="text-right font-semibold text-pos tabular-nums">{brl(s.owedToMe)}</dd>
              </dl>
              <p className="mt-3 text-sm text-ink-500">Veja o saldo de cada pessoa na aba Pessoas.</p>
            </section>
          </div>

          {history && <HistoryChart history={history} month={month} salary={profile.salary_cents} />}
        </>
      )}
    </div>
  );
}

function HistoryChart({ history, month, salary }: { history: History; month: string; salary: number }) {
  const data = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month, i - 5);
    const tx = (kind: string) =>
      history.transactions.find((t) => t.month === m && t.kind === kind)?.cents ?? 0;
    const work = history.work.find((w) => w.month === m)?.cents ?? 0;
    return {
      label: MONTH_NAMES[Number(m.slice(5)) - 1].slice(0, 3),
      Receita: (tx("income") + work + salary) / 100,
      Despesas: tx("expense") / 100,
    };
  });
  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Últimos 6 meses</h2>
        <div className="flex gap-4 text-sm text-ink-500">
          <span className="flex items-center gap-1.5"><Dot color="var(--color-pos)" /> Receita</span>
          <span className="flex items-center gap-1.5"><Dot color="var(--color-neg)" /> Despesas</span>
        </div>
      </div>
      <p className="text-sm text-ink-500">Contas fixas ainda não lançadas não entram aqui.</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer>
          <BarChart data={data} barGap={2} margin={{ left: -8, right: 4 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--color-line)" }} tick={{ fill: "var(--color-ink-500)", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "var(--color-ink-500)", fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 100) / 10}k`} />
            <Tooltip cursor={{ fill: "var(--color-page)" }} formatter={(v) => brl(Math.round(Number(v) * 100))} />
            <Bar dataKey="Receita" fill="var(--color-pos)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="Despesas" fill="var(--color-neg)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
