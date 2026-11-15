import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { brl, hms } from "../../../shared/finance";
import { Dot } from "../../components";
import { useStore } from "../../store";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Linha "rótulo ........ valor" de uma lista de definições. */
function Row({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <>
      <dt className="text-ink-500">{label}</dt>
      <dd className={`text-right tabular-nums ${className}`}>{children}</dd>
    </>
  );
}

export function HoursCard() {
  const { profile, summary: s } = useStore();
  const progress = s.goalSeconds ? Math.min(1, s.workedSeconds / s.goalSeconds) : 0;
  return (
    <Card title="Horas de serviço">
      <p className="mt-2 text-3xl font-bold tabular-nums">{hms(s.workedSeconds)}</p>
      <p className="text-sm text-ink-500">
        de {profile.hours_goal}h · {s.missingSeconds ? `faltam ${hms(s.missingSeconds)}` : "meta batida 🎉"}
      </p>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-page"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress * 100}%` }} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Row label="Valor da hora">{brl(profile.hourly_rate_cents)}</Row>
        <Row label="Ganho com horas" className="font-semibold">
          {brl(s.hoursIncome)}
        </Row>
        {s.salary > 0 && <Row label="Salário">{brl(s.salary)}</Row>}
        {s.otherIncome > 0 && <Row label="Outras receitas">{brl(s.otherIncome)}</Row>}
      </dl>
    </Card>
  );
}

export function CategoriesCard() {
  const { summary: s } = useStore();
  return (
    <Card title="Despesas por categoria">
      {s.byCategory.length === 0 ? (
        <p className="mt-6 text-center text-sm text-ink-500">Nenhuma despesa neste mês.</p>
      ) : (
        <div className="mt-2 flex items-center gap-4">
          <div className="size-28 shrink-0 sm:size-32">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={s.byCategory}
                  dataKey="cents"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="100%"
                  stroke="var(--color-card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
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
                <span className="hidden text-ink-500 tabular-nums sm:inline">
                  {Math.round((c.cents / s.expenses) * 100)}%
                </span>
                <span className="text-right font-medium tabular-nums">{brl(c.cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function AccountsCard() {
  const { summary: s, entries } = useStore();
  const pending = entries.filter((e) => e.kind === "expense" && !e.paid);
  return (
    <Card title="Por conta e cartão">
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
    </Card>
  );
}

export function PeopleCard() {
  const { summary: s } = useStore();
  return (
    <Card title="Pessoas neste mês">
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Row label="Eu devo" className="font-semibold text-neg">
          {brl(s.iOwe)}
        </Row>
        <Row label="Me devem" className="font-semibold text-pos">
          {brl(s.owedToMe)}
        </Row>
      </dl>
      <p className="mt-3 text-sm text-ink-500">Veja o saldo de cada pessoa na aba Pessoas.</p>
    </Card>
  );
}
