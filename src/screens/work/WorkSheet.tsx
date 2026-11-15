import { useState, type FormEvent } from "react";
import { brl, hms, parseDuration, todayISO, workValueCents, type WorkEntry } from "../../../shared/finance";
import { del, post, put } from "../../api";
import { confirmDelete, ErrorNote, Field, FormActions, MoneyField, Sheet } from "../../components";
import { useAction } from "../../hooks/useAction";
import { useStore } from "../../store";

/** Lançar ou editar um registro de horas à mão. */
export default function WorkSheet({ entry, onClose }: { entry: Partial<WorkEntry>; onClose: () => void }) {
  const { profile, reload } = useStore();
  const [date, setDate] = useState(entry.date ?? todayISO());
  const [duration, setDuration] = useState(entry.seconds ? hms(entry.seconds) : "");
  const [rate, setRate] = useState(entry.rate_cents ?? profile.hourly_rate_cents);
  const [note, setNote] = useState(entry.note ?? "");
  const { busy, error, setError, run } = useAction();
  const seconds = parseDuration(duration);

  const finish = async () => {
    await reload();
    onClose();
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!seconds) return setError("Informe a duração, ex.: 7:30 ou 7,5.");
    void run(async () => {
      const body = { date, seconds, rate_cents: rate, note };
      if (entry.id) await put(`work/${entry.id}`, body);
      else await post("work", body);
      await finish();
    });
  }

  async function remove() {
    if (!(await confirmDelete("Excluir este registro de horas?"))) return;
    await run(async () => {
      await del(`work/${entry.id}`);
      await finish();
    });
  }

  return (
    <Sheet title={entry.id ? "Editar horas" : "Lançar horas"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
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
          hint={seconds ? `Total: ${brl(workValueCents({ seconds, rate_cents: rate }))}` : undefined}
        />
        <Field label="Observação">
          <input className="field" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <FormActions busy={busy} onDelete={entry.id ? remove : undefined} />
      </form>
    </Sheet>
  );
}
