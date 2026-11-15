import { RiCheckboxBlankCircleLine, RiCheckboxCircleFill, RiRepeatLine } from "react-icons/ri";
import type { Entry } from "../../../shared/finance";
import { Amount } from "../../components";
import { useStore } from "../../store";

/** Uma linha da lista de lançamentos: marcar como pago + abrir para editar. */
export default function EntryRow({
  entry: e,
  onTogglePaid,
  onOpen,
}: {
  entry: Entry;
  onTogglePaid: () => void;
  onOpen: () => void;
}) {
  const { categories, accounts } = useStore();
  const c = categories.find((x) => x.id === e.category_id);
  const a = accounts.find((x) => x.id === e.account_id);
  const meta = [c?.name, a?.name, e.installments && `${e.installment}/${e.installments}`].filter(Boolean);

  return (
    <li className="flex items-center gap-1">
      <button
        className="icon-btn ml-1 shrink-0"
        aria-label={e.paid ? "Marcar como não pago" : "Marcar como pago"}
        onClick={onTogglePaid}
      >
        {e.paid ? (
          <RiCheckboxCircleFill className="size-6 text-brand-600" />
        ) : (
          <RiCheckboxBlankCircleLine className="size-6" />
        )}
      </button>
      <button className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-4 text-left" onClick={onOpen}>
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: c?.color ?? "#a1a1aa" }} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${e.planned ? "text-ink-500" : ""}`}>{e.description}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
            {e.recurrence_id && (
              <span className="inline-flex items-center gap-0.5">
                <RiRepeatLine className="size-3.5" /> {e.planned ? "fixa · prevista" : "fixa"}
              </span>
            )}
            {meta.join(" · ")}
            {e.person && <PersonBadge entry={e} />}
          </span>
        </span>
        <Amount
          kind={e.kind}
          cents={e.amount_cents}
          className={`shrink-0 font-semibold ${e.kind === "income" ? "text-pos" : ""}`}
        />
      </button>
    </li>
  );
}

function PersonBadge({ entry: e }: { entry: Entry }) {
  const expense = e.kind === "expense";
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-medium ${expense ? "bg-neg-50 text-neg" : "bg-brand-50 text-brand-700"}`}
    >
      {expense ? `devo a ${e.person}` : `${e.person} me deve`}
    </span>
  );
}
