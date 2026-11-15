import { useState } from "react";
import { brl, hms, workValueCents, type WorkEntry } from "../../../shared/finance";
import { PageHeader, Spinner, Stat } from "../../components";
import { formatDate } from "../../format";
import { useStore } from "../../store";
import Timer from "./Timer";
import WorkSheet from "./WorkSheet";

export default function Work() {
  const { profile, work, summary: s, loadingMonth } = useStore();
  const [editing, setEditing] = useState<Partial<WorkEntry> | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Horas de serviço" withMonth />

      <Timer />

      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Trabalhadas" value={hms(s.workedSeconds)} />
        <Stat label="Meta" value={`${profile.hours_goal}:00:00`} />
        <Stat label="Faltam" value={hms(s.missingSeconds)} />
        <Stat label="Ganho" value={brl(s.hoursIncome)} />
      </section>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Registros do mês</h2>
        <button className="btn-secondary" onClick={() => setEditing({})}>
          Lançar horas
        </button>
      </div>

      {loadingMonth ? (
        <Spinner />
      ) : work.length === 0 ? (
        <p className="card py-10 text-center text-ink-500">Nenhuma hora registrada neste mês.</p>
      ) : (
        <ul className="card divide-y divide-line p-0!">
          {work.map((w) => (
            <li key={w.id}>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setEditing(w)}>
                <span className="w-20 shrink-0 text-sm whitespace-nowrap text-ink-500">
                  {formatDate(w.date, { day: "2-digit", month: "short" })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium tabular-nums">{hms(w.seconds)}</span>
                  {w.note && <span className="block truncate text-xs text-ink-500">{w.note}</span>}
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{brl(workValueCents(w))}</span>
                  <span className="block text-xs text-ink-500">{brl(w.rate_cents)}/h</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && <WorkSheet entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
