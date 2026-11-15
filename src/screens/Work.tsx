import { useEffect, useState, type FormEvent } from "react";
import { RiDeleteBinLine, RiPauseFill, RiPlayFill } from "react-icons/ri";
import { useStore } from "../App";
import { del, post, put } from "../api";
import {
  brl,
  hms,
  parseDuration,
  todayISO,
  type Profile,
  type WorkEntry,
} from "../../shared/finance";
import { confirmDelete, ErrorNote, MonthPicker, MoneyField, Sheet, Spinner } from "../ui";

export default function Work() {
  const store = useStore();
  const { profile, work, month, setMonth, summary: s, loadingMonth } = store;
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Partial<WorkEntry> | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Horas de serviço</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <Timer onError={setError} />
      <ErrorNote>{error}</ErrorNote>

      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Trabalhadas", hms(s.workedSeconds)],
          ["Meta", `${profile.hours_goal}:00:00`],
          ["Faltam", hms(s.missingSeconds)],
          ["Ganho", brl(s.hoursIncome)],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-sm text-ink-500">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
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
                  {new Date(`${w.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium tabular-nums">{hms(w.seconds)}</span>
                  {w.note && <span className="block truncate text-xs text-ink-500">{w.note}</span>}
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{brl(Math.round((w.seconds * w.rate_cents) / 3600))}</span>
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

/** Cronômetro salvo na conta: dá para começar no celular e parar no computador. */
function Timer({ onError }: { onError: (m: string) => void }) {
  const store = useStore();
  const started = store.profile.timer_started_at;
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [started]);
  const elapsed = started ? Math.max(0, (now - new Date(started).getTime()) / 1000) : 0;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    onError("");
    try {
      if (!started) store.setProfile(await post<Profile>("timer/start"));
      else {
        const r = await post<{ profile: Profile }>("timer/stop", { date: todayISO(new Date(started)) });
        store.setProfile(r.profile);
        await store.reload();
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex items-center gap-4">
      <button
        className={`flex size-16 shrink-0 items-center justify-center rounded-full text-white ${started ? "bg-neg" : "bg-brand-600"}`}
        aria-label={started ? "Parar e salvar" : "Começar a contar"}
        disabled={busy}
        onClick={toggle}
      >
        {started ? <RiPauseFill className="size-8" /> : <RiPlayFill className="size-8" />}
      </button>
      <div>
        <p className="text-3xl font-bold tabular-nums">{hms(elapsed)}</p>
        <p className="text-sm text-ink-500">
          {started
            ? `Contando desde ${new Date(started).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${brl(Math.round((elapsed * store.profile.hourly_rate_cents) / 3600))}`
            : "Toque para começar a contar o tempo de serviço."}
        </p>
      </div>
    </section>
  );
}

function WorkSheet({ entry, onClose }: { entry: Partial<WorkEntry>; onClose: () => void }) {
  const store = useStore();
  const [date, setDate] = useState(entry.date ?? todayISO());
  const [duration, setDuration] = useState(entry.seconds ? hms(entry.seconds) : "");
  const [rate, setRate] = useState(entry.rate_cents ?? store.profile.hourly_rate_cents);
  const [note, setNote] = useState(entry.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seconds = parseDuration(duration);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!seconds) return setError("Informe a duração, ex.: 7:30 ou 7,5.");
    setBusy(true);
    try {
      const body = { date, seconds, rate_cents: rate, note };
      if (entry.id) await put(`work/${entry.id}`, body);
      else await post("work", body);
      await store.reload();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirmDelete("Excluir este registro de horas?"))) return;
    await del(`work/${entry.id}`);
    await store.reload();
    onClose();
  }

  return (
    <Sheet title={entry.id ? "Editar horas" : "Lançar horas"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Data</span>
            <input className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Duração</span>
            <input
              className="field tabular-nums"
              placeholder="hh:mm:ss"
              autoFocus
              required
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <span className="mt-1 block text-xs text-ink-500">
              {seconds ? hms(seconds) : "Ex.: 7:30, 7h30 ou 7,5"}
            </span>
          </label>
        </div>
        <MoneyField
          label="Valor da hora"
          value={rate}
          onChange={setRate}
          hint={seconds ? `Total: ${brl(Math.round((seconds * rate) / 3600))}` : undefined}
        />
        <label className="block">
          <span className="label">Observação</span>
          <input className="field" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
        {entry.id && (
          <button type="button" className="btn-ghost text-neg" onClick={remove}>
            <RiDeleteBinLine className="size-5" /> Excluir
          </button>
        )}
      </form>
    </Sheet>
  );
}
