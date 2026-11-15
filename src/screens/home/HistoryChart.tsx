import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addMonths, brl, MONTH_NAMES } from "../../../shared/finance";
import { api } from "../../api";
import { Dot } from "../../components";
import { useStore } from "../../store";

type History = {
  transactions: { month: string; kind: "expense" | "income"; cents: number }[];
  work: { month: string; cents: number }[];
};

const AXIS_TICK = { fill: "var(--color-ink-500)", fontSize: 12 };

/** Receita × despesas dos 6 meses até o mês aberto. */
export default function HistoryChart() {
  const { month, transactions, work, profile } = useStore();
  const [history, setHistory] = useState<History | null>(null);

  // transactions/work mudam de referência a cada recarga do mês: qualquer lançamento,
  // edição ou exclusão atualiza o gráfico, não só quando muda a quantidade.
  useEffect(() => {
    let alive = true;
    api<History>(`history?to=${month}`)
      .then((h) => alive && setHistory(h))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [month, transactions, work]);

  if (!history) return null;

  const data = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month, i - 5);
    const tx = (kind: string) => history.transactions.find((t) => t.month === m && t.kind === kind)?.cents ?? 0;
    const hours = history.work.find((w) => w.month === m)?.cents ?? 0;
    return {
      label: MONTH_NAMES[Number(m.slice(5)) - 1].slice(0, 3),
      Receita: (tx("income") + hours + profile.salary_cents) / 100,
      Despesas: tx("expense") / 100,
    };
  });

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Últimos 6 meses</h2>
        <div className="flex gap-4 text-sm text-ink-500">
          <span className="flex items-center gap-1.5">
            <Dot color="var(--color-pos)" /> Receita
          </span>
          <span className="flex items-center gap-1.5">
            <Dot color="var(--color-neg)" /> Despesas
          </span>
        </div>
      </div>
      <p className="text-sm text-ink-500">Contas fixas ainda não lançadas não entram aqui.</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer>
          <BarChart data={data} barGap={2} margin={{ left: -8, right: 4 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--color-line)" }} tick={AXIS_TICK} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={AXIS_TICK}
              tickFormatter={(v) => `${Math.round(v / 100) / 10}k`}
            />
            <Tooltip cursor={{ fill: "var(--color-page)" }} formatter={(v) => brl(Math.round(Number(v) * 100))} />
            <Bar dataKey="Receita" fill="var(--color-pos)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="Despesas" fill="var(--color-neg)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
