import { brl, hms, hourValueCents, hoursFor } from "../../../shared/finance";
import { Dot } from "../../components";
import { useStore } from "../../store";

/** Sobra do mês, receita × despesas e projeção pela meta de horas. */
export default function BalanceCard() {
  const { profile, summary: s } = useStore();
  const hourCents = hourValueCents(profile);

  return (
    <section className="card">
      <p className="text-sm font-medium text-ink-500">Sobra do mês</p>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${s.balance < 0 ? "text-neg" : "text-pos"}`}>
        {brl(s.balance)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Total color="var(--color-pos)" label="Receita" cents={s.income} />
        <Total color="var(--color-neg)" label="Despesas" cents={s.expenses} />
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
        <p className="mt-2 text-sm text-ink-500">Para zerar faltam {hoursFor(-s.balance, hourCents)} de trabalho.</p>
      )}
    </section>
  );
}

function Total({ color, label, cents }: { color: string; label: string; cents: number }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm text-ink-500">
        <Dot color={color} /> {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{brl(cents)}</p>
    </div>
  );
}
