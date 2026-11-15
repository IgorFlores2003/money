import { brl, monthLabel, type PersonBalance, type Transaction } from "../../../shared/finance";
import { Amount } from "../../components";
import { useNav } from "../../navigation";

/** Saldo de uma pessoa; aberto, lista os lançamentos em aberto e o botão de quitar. */
export default function PersonCard({
  balance: p,
  items,
  expanded,
  onToggle,
  onSettle,
}: {
  balance: PersonBalance;
  items: Transaction[];
  expanded: boolean;
  onToggle: () => void;
  onSettle: () => void;
}) {
  const { editEntry } = useNav();
  return (
    <li className="card">
      <button className="flex w-full items-center gap-3 text-left" onClick={onToggle} aria-expanded={expanded}>
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
                <button className="flex w-full gap-2 text-left" onClick={() => editEntry(t)}>
                  <span className="flex-1">
                    {t.description}
                    {t.installments && ` ${t.installment}/${t.installments}`}
                    <span className="block text-xs text-ink-500">{monthLabel(t.month)}</span>
                  </span>
                  <Amount kind={t.kind} cents={t.amount_cents} className={t.kind === "income" ? "text-pos" : "text-neg"} />
                </button>
              </li>
            ))}
          </ul>
          <button className="btn-secondary mt-4 w-full" onClick={onSettle}>
            Quitar tudo
          </button>
        </div>
      )}
    </li>
  );
}
