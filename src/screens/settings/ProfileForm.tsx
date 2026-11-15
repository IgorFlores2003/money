import { useState, type FormEvent } from "react";
import { brl, type Profile } from "../../../shared/finance";
import { put } from "../../api";
import { ErrorNote, Field, MoneyField } from "../../components";
import { useAction } from "../../hooks/useAction";
import { useStore } from "../../store";

/** Nome, valor da hora, salário e meta de horas. */
export default function ProfileForm() {
  const { profile: p, setProfile } = useStore();
  const [name, setName] = useState(p.name);
  const [rate, setRate] = useState(p.hourly_rate_cents);
  const [salary, setSalary] = useState(p.salary_cents);
  const [goal, setGoal] = useState(String(p.hours_goal));
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    void run(async () => {
      setProfile(
        await put<Profile>("me", {
          name,
          hourly_rate_cents: rate,
          salary_cents: salary,
          hours_goal: Math.max(0, Math.min(744, Math.round(Number(goal) || 0))),
        }),
      );
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4">
      <h2 className="font-semibold">Perfil e renda</h2>
      <Field label="Nome">
        <input className="field" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyField label="Quanto ganho por hora" value={rate} onChange={setRate} hint="Multiplica as horas lançadas." />
        <MoneyField label="Salário fixo mensal" value={salary} onChange={setSalary} hint="Entra todo mês na receita." />
        <Field
          label="Meta de horas no mês"
          hint={rate > 0 && Number(goal) > 0 ? `Potencial: ${brl(rate * Number(goal))}` : "Ex.: 80 ou 168"}
        >
          <input
            className="field"
            type="number"
            min={0}
            max={744}
            inputMode="numeric"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </Field>
      </div>
      <p className="text-sm text-ink-500">
        Pode usar só um dos dois ou os dois juntos (salário + horas extras). Sem valor da hora, ela é calculada pelo
        salário ÷ meta.
      </p>
      <ErrorNote>{error}</ErrorNote>
      <button className="btn-primary self-start" disabled={busy}>
        {busy ? "Salvando…" : saved ? "Salvo ✓" : "Salvar"}
      </button>
    </form>
  );
}
