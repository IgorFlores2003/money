import { useState } from "react";
import { RiCheckboxBlankCircleLine, RiCheckboxCircleFill, RiRepeatLine, RiSearchLine } from "react-icons/ri";
import { useStore } from "../App";
import { post, put } from "../api";
import { brl, type Entry } from "../../shared/finance";
import { ErrorNote, MonthPicker, Segmented, Spinner } from "../ui";

type Filter = "all" | "expense" | "income";

export default function Entries() {
  const store = useStore();
  const { entries, categories, accounts, month, setMonth, loadingMonth, summary } = store;
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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

  async function togglePaid(e: Entry) {
    setError("");
    try {
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
      await store.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Receitas", summary.otherIncome, "text-pos"],
          ["Despesas", summary.expenses, "text-neg"],
          ["Pago", summary.paidExpenses, "text-ink-900"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="card p-3!">
            <p className="text-xs text-ink-500">{label}</p>
            <p className={`text-sm font-semibold tabular-nums sm:text-base ${color}`}>{brl(value as number)}</p>
          </div>
        ))}
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
          <button className="btn-primary mt-4" onClick={() => store.editEntry()}>
            Lançar despesa ou receita
          </button>
        </div>
      ) : (
        <>
          {[...byDate].map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-2 px-1 text-sm font-medium text-ink-500">
                {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              </h2>
              <ul className="card divide-y divide-line p-0!">
                {items.map((e) => {
                  const c = categories.find((x) => x.id === e.category_id);
                  const a = accounts.find((x) => x.id === e.account_id);
                  const meta = [
                    c?.name,
                    a?.name,
                    e.installments && `${e.installment}/${e.installments}`,
                  ].filter(Boolean);
                  return (
                    <li key={e.id} className="flex items-center gap-1">
                      <button
                        className="icon-btn ml-1 shrink-0"
                        aria-label={e.paid ? "Marcar como não pago" : "Marcar como pago"}
                        onClick={() => togglePaid(e)}
                      >
                        {e.paid ? (
                          <RiCheckboxCircleFill className="size-6 text-brand-600" />
                        ) : (
                          <RiCheckboxBlankCircleLine className="size-6" />
                        )}
                      </button>
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-4 text-left"
                        onClick={() => store.editEntry(e)}
                      >
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: c?.color ?? "#a1a1aa" }} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate font-medium ${e.planned ? "text-ink-500" : ""}`}>
                            {e.description}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                            {e.recurrence_id && (
                              <span className="inline-flex items-center gap-0.5">
                                <RiRepeatLine className="size-3.5" /> {e.planned ? "fixa · prevista" : "fixa"}
                              </span>
                            )}
                            {meta.join(" · ")}
                            {e.person && (
                              <span className={`rounded-full px-2 py-0.5 font-medium ${e.kind === "expense" ? "bg-neg-50 text-neg" : "bg-brand-50 text-brand-700"}`}>
                                {e.kind === "expense" ? `devo a ${e.person}` : `${e.person} me deve`}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className={`shrink-0 font-semibold tabular-nums ${e.kind === "income" ? "text-pos" : ""}`}>
                          {e.kind === "income" ? "+" : "−"}
                          {brl(e.amount_cents)}
                        </span>
                      </button>
                    </li>
                  );
                })}
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
