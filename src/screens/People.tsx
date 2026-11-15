import { useEffect, useState } from "react";
import { useStore } from "../App";
import { api, post } from "../api";
import { brl, monthLabel, personBalances, type Transaction } from "../../shared/finance";
import { ask, ErrorNote, Spinner } from "../ui";

/** Quem me deve e a quem eu devo, somando tudo em aberto de todos os meses. */
export default function People() {
  const store = useStore();
  const [open, setOpen] = useState<Transaction[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api<Transaction[]>("people").then(setOpen).catch((e) => setError((e as Error).message));
  useEffect(() => {
    void load();
  }, [store.transactions]); // recarrega quando o mês muda ou algo é lançado

  async function settle(person: string, balance: number) {
    const ok = await ask(
      `Quitar tudo com ${person}?`,
      [{ label: "Marcar tudo como pago", value: "yes" }],
      balance > 0 ? `${person} te pagou ${brl(balance)}.` : `Você pagou ${brl(-balance)} a ${person}.`,
    );
    if (!ok) return;
    await post("people/settle", { person });
    await Promise.all([load(), store.reload()]);
  }

  if (!open) return error ? <ErrorNote>{error}</ErrorNote> : <Spinner />;
  const people = personBalances(open);
  const owed = people.filter((p) => p.balance > 0).reduce((t, p) => t + p.balance, 0);
  const owe = people.filter((p) => p.balance < 0).reduce((t, p) => t - p.balance, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-sm text-ink-500">Me devem</p>
          <p className="text-2xl font-bold text-pos tabular-nums">{brl(owed)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-ink-500">Eu devo</p>
          <p className="text-2xl font-bold text-neg tabular-nums">{brl(owe)}</p>
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {people.length === 0 ? (
        <p className="card py-10 text-center text-ink-500">
          Nada em aberto. Ao lançar uma despesa ou receita, escolha “Devo a alguém” ou “Alguém me deve”.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {people.map((p) => {
            const items = open.filter((t) => t.person?.trim().toLowerCase() === p.person.toLowerCase());
            const expanded = selected === p.person;
            return (
              <li key={p.person} className="card">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setSelected(expanded ? "" : p.person)} aria-expanded={expanded}>
                  <span className="flex size-10 items-center justify-center rounded-full bg-page font-semibold">
                    {p.person.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{p.person}</span>
                    <span className="text-sm text-ink-500">{p.open} lançamento(s) em aberto</span>
                  </span>
                  <span className="text-right">
                    <span className={`block font-bold tabular-nums ${p.balance >= 0 ? "text-pos" : "text-neg"}`}>
                      {brl(Math.abs(p.balance))}
                    </span>
                    <span className="text-xs text-ink-500">{p.balance >= 0 ? "te deve" : "você deve"}</span>
                  </span>
                </button>
                {expanded && (
                  <div className="mt-4 border-t border-line pt-3">
                    <ul className="flex flex-col gap-2 text-sm">
                      {items.map((t) => (
                        <li key={t.id}>
                          <button className="flex w-full gap-2 text-left" onClick={() => store.editEntry(t)}>
                            <span className="flex-1">
                              {t.description}
                              {t.installments && ` ${t.installment}/${t.installments}`}
                              <span className="block text-xs text-ink-500">{monthLabel(t.month)}</span>
                            </span>
                            <span className={`tabular-nums ${t.kind === "income" ? "text-pos" : "text-neg"}`}>
                              {t.kind === "income" ? "+" : "−"}
                              {brl(t.amount_cents)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button className="btn-secondary mt-4 w-full" onClick={() => settle(p.person, p.balance)}>
                      Quitar tudo
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
