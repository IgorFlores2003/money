import { useCallback, useEffect, useState } from "react";
import { brl, personBalances, type Transaction } from "../../../shared/finance";
import { api, post } from "../../api";
import { ask, ErrorNote, PageHeader, Spinner, Stat } from "../../components";
import { useAction } from "../../hooks/useAction";
import { useStore } from "../../store";
import PersonCard from "./PersonCard";

/** Quem me deve e a quem eu devo, somando tudo em aberto de todos os meses. */
export default function People() {
  const { transactions, reload } = useStore();
  const [open, setOpen] = useState<Transaction[] | null>(null);
  const [selected, setSelected] = useState("");
  const { error, setError, run } = useAction();

  const load = useCallback(
    () => api<Transaction[]>("people").then(setOpen).catch((e) => setError((e as Error).message)),
    [setError],
  );
  // Recarrega quando o mês muda ou algo é lançado.
  useEffect(() => {
    void load();
  }, [load, transactions]);

  async function settle(person: string, balance: number) {
    const ok = await ask(
      `Quitar tudo com ${person}?`,
      [{ label: "Marcar tudo como pago", value: "yes" }],
      balance > 0 ? `${person} te pagou ${brl(balance)}.` : `Você pagou ${brl(-balance)} a ${person}.`,
    );
    if (!ok) return;
    await run(async () => {
      await post("people/settle", { person });
      await Promise.all([load(), reload()]);
    });
  }

  if (!open) return error ? <ErrorNote>{error}</ErrorNote> : <Spinner />;
  const people = personBalances(open);
  const owed = people.filter((p) => p.balance > 0).reduce((t, p) => t + p.balance, 0);
  const owe = people.filter((p) => p.balance < 0).reduce((t, p) => t - p.balance, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pessoas" />
      <div className="grid grid-cols-2 gap-3">
        <Stat card size="lg" label="Me devem" value={brl(owed)} tone="pos" />
        <Stat card size="lg" label="Eu devo" value={brl(owe)} tone="neg" />
      </div>
      <ErrorNote>{error}</ErrorNote>
      {people.length === 0 ? (
        <p className="card py-10 text-center text-ink-500">
          Nada em aberto. Ao lançar uma despesa ou receita, escolha “Devo a alguém” ou “Alguém me deve”.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {people.map((p) => (
            <PersonCard
              key={p.person}
              balance={p}
              items={open.filter((t) => t.person?.trim().toLowerCase() === p.person.toLowerCase())}
              expanded={selected === p.person}
              onToggle={() => setSelected(selected === p.person ? "" : p.person)}
              onSettle={() => settle(p.person, p.balance)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
