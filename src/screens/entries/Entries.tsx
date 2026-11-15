import { useState } from "react";
import { RiSearchLine } from "react-icons/ri";
import { brl, type Entry } from "../../../shared/finance";
import { post, put } from "../../api";
import { ErrorNote, PageHeader, Segmented, Spinner, Stat } from "../../components";
import { formatDate } from "../../format";
import { useAction } from "../../hooks/useAction";
import { useNav } from "../../navigation";
import { useStore } from "../../store";
import EntryRow from "./EntryRow";

type Filter = "all" | "expense" | "income";

export default function Entries() {
  const { entries, categories, loadingMonth, summary, reload } = useStore();
  const { editEntry } = useNav();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const { error, run } = useAction();

  const q = search.trim().toLowerCase();
  const list = entries.filter(
    (e) =>
      (filter === "all" || e.kind === filter) &&
      (!category || e.category_id === category) &&
      (!q || e.description.toLowerCase().includes(q) || e.person?.toLowerCase().includes(q)),
  );
  const byDate = new Map<string, Entry[]>();
  for (const e of list) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const total = list.reduce((t, e) => t + (e.kind === "income" ? e.amount_cents : -e.amount_cents), 0);

  const togglePaid = (e: Entry) =>
    run(async () => {
      if (e.planned)
        // Conta fixa prevista: marcar como paga lança o valor neste mês.
        await post("transactions", {
          kind: e.kind,
          amount_cents: e.amount_cents,
          description: e.description,
          category_id: e.category_id,
          account_id: e.account_id,
          person: e.person,
          date: e.date,
          month: e.month,
          paid: true,
          recurrence_id: e.recurrence_id,
        });
      else await put(`transactions/${e.id}`, { paid: !e.paid });
      await reload();
    });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Lançamentos" withMonth />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat card size="sm" label="Receitas" value={brl(summary.otherIncome)} tone="pos" />
        <Stat card size="sm" label="Despesas" value={brl(summary.expenses)} tone="neg" />
        <Stat card size="sm" label="Pago" value={brl(summary.paidExpenses)} />
      </div>

      <div className="flex flex-col gap-3">
        <Segmented
          label="Filtrar tipo"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setCategory("");
          }}
          options={[
            { value: "all", label: "Tudo" },
            { value: "expense", label: "Despesas" },
            { value: "income", label: "Receitas" },
          ]}
        />
        <div className="flex gap-2">
          <label className="relative flex-1">
            <RiSearchLine className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-400" />
            <input
              className="field pl-10"
              type="search"
              placeholder="Buscar descrição ou pessoa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className="field w-40"
            aria-label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Categorias</option>
            {categories
              .filter((c) => filter === "all" || c.kind === filter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {loadingMonth ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="card py-12 text-center text-ink-500">
          <p>Nada por aqui.</p>
          <button className="btn-primary mt-4" onClick={() => editEntry()}>
            Lançar despesa ou receita
          </button>
        </div>
      ) : (
        <>
          {[...byDate].map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-2 px-1 text-sm font-medium text-ink-500">
                {formatDate(date, { weekday: "short", day: "2-digit", month: "short" })}
              </h2>
              <ul className="card divide-y divide-line p-0!">
                {items.map((e) => (
                  <EntryRow key={e.id} entry={e} onTogglePaid={() => togglePaid(e)} onOpen={() => editEntry(e)} />
                ))}
              </ul>
            </section>
          ))}
          <p className="text-right text-sm text-ink-500">
            Saldo dos itens listados: <strong className={total < 0 ? "text-neg" : "text-pos"}>{brl(total)}</strong>
          </p>
        </>
      )}
    </div>
  );
}
