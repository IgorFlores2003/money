import { useMemo, useState, type FormEvent } from "react";
import { RiAddLine, RiDeleteBinLine } from "react-icons/ri";
import { useStore } from "../App";
import { del, post, put } from "../api";
import {
  addMonths,
  billingMonth,
  brl,
  hourValueCents,
  hoursFor,
  monthLabel,
  todayISO,
  type Category,
  type Entry,
  type Kind,
} from "../../shared/finance";
import { ask, ColorPicker, ErrorNote, MoneyField, Segmented, Sheet } from "../ui";

export type Draft = Partial<Entry>;
type Repeat = "once" | "installments" | "monthly";
type PersonMode = "none" | "person";

export default function TransactionSheet({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const store = useStore();
  const { categories, accounts, month, profile } = store;
  const editing = Boolean(draft.id && !draft.planned);
  const planned = Boolean(draft.planned);
  const [kind, setKind] = useState<Kind>(draft.kind ?? "expense");
  const [amount, setAmount] = useState(draft.amount_cents ?? 0);
  const [description, setDescription] = useState(draft.description ?? "");
  const [categoryId, setCategoryId] = useState(draft.category_id ?? "");
  const [accountId, setAccountId] = useState(
    draft.account_id ?? (editing || planned ? "" : accounts.find((a) => !a.archived)?.id ?? ""),
  );
  // Lançamento novo num mês diferente do atual começa no dia 1 daquele mês.
  const [date, setDate] = useState(
    draft.date ?? (todayISO().startsWith(month) ? todayISO() : `${month}-01`),
  );
  const [monthOverride, setMonthOverride] = useState(draft.month && editing ? draft.month : "");
  const [person, setPerson] = useState(draft.person ?? "");
  const [personMode, setPersonMode] = useState<PersonMode>(draft.person ? "person" : "none");
  const [paid, setPaid] = useState(draft.paid ?? false);
  const [repeat, setRepeat] = useState<Repeat>("once");
  const [count, setCount] = useState(2);
  const [first, setFirst] = useState(1);
  const [isTotal, setIsTotal] = useState(false);
  const [endMonth, setEndMonth] = useState("");
  const [applyGroup, setApplyGroup] = useState(true);
  const [newCategory, setNewCategory] = useState<{ name: string; color: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const account = accounts.find((a) => a.id === accountId);
  const autoMonth = billingMonth(date, account);
  const effectiveMonth = monthOverride || autoMonth;
  const visibleCategories = categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === categoryId),
  );
  const hourCents = hourValueCents(profile);
  const people = useMemo(
    () => [...new Set(store.transactions.map((t) => t.person).filter(Boolean))] as string[],
    [store.transactions],
  );

  function switchKind(k: Kind) {
    setKind(k);
    if (categories.find((c) => c.id === categoryId)?.kind !== k) setCategoryId("");
  }

  async function createCategory() {
    if (!newCategory?.name.trim()) return;
    try {
      const c = await post<Category>("categories", { kind, ...newCategory });
      await store.reloadMeta();
      setCategoryId(c.id);
      setNewCategory(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (amount <= 0) return setError("Informe um valor maior que zero.");
    setBusy(true);
    setError("");
    const fields = {
      kind,
      amount_cents: amount,
      description,
      category_id: categoryId || null,
      account_id: accountId || null,
      person: personMode === "person" ? person.trim() || null : null,
    };
    try {
      if (personMode === "person" && !fields.person) throw new Error("Informe o nome da pessoa.");
      if (editing) {
        await put(`transactions/${draft.id}`, {
          ...fields,
          date,
          month: effectiveMonth,
          paid,
          apply_to_group: applyGroup,
        });
      } else if (repeat === "monthly" && !planned) {
        await post("recurrences", {
          ...fields,
          day: Number(date.slice(8, 10)),
          start_month: effectiveMonth,
          end_month: endMonth || null,
        });
      } else {
        await post("transactions", {
          ...fields,
          date,
          month: effectiveMonth,
          paid,
          recurrence_id: planned ? draft.recurrence_id : null,
          ...(repeat === "installments" && {
            installments: count,
            first_installment: first,
            amount_is_total: isTotal,
          }),
        });
      }
      await store.reload();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateRule() {
    if (!draft.recurrence_id || busy) return;
    setBusy(true);
    try {
      const rule = store.recurrences.find((r) => r.id === draft.recurrence_id);
      await put(`recurrences/${draft.recurrence_id}`, {
        kind,
        amount_cents: amount,
        description,
        category_id: categoryId || null,
        account_id: accountId || null,
        person: personMode === "person" ? person.trim() || null : null,
        day: Number(date.slice(8, 10)),
        start_month: rule?.start_month ?? month,
        end_month: rule?.end_month ?? null,
      });
      await store.reload();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (planned && draft.recurrence_id) {
      const rule = store.recurrences.find((r) => r.id === draft.recurrence_id);
      const choice = await ask(
        `Excluir “${draft.description}”?`,
        [
          { label: `Parar a partir de ${monthLabel(month)}`, value: "stop", danger: true },
          { label: "Excluir de todos os meses", value: "all", danger: true },
        ],
        "É uma conta fixa. Os meses já lançados continuam como estão.",
      );
      if (!choice) return;
      if (choice === "all" || !rule || rule.start_month >= month) await del(`recurrences/${draft.recurrence_id}`);
      else await put(`recurrences/${rule.id}`, { ...rule, end_month: addMonths(month, -1) });
    } else {
      const options = draft.group_id
        ? [
            { label: "Só esta parcela", value: "one", danger: true },
            { label: "Esta e as próximas", value: "next", danger: true },
            { label: "Todas as parcelas", value: "group", danger: true },
          ]
        : [{ label: "Excluir", value: "one", danger: true }];
      const choice = await ask(`Excluir “${draft.description}”?`, options);
      if (!choice) return;
      await del(`transactions/${draft.id}${choice === "one" ? "" : `?scope=${choice}`}`);
    }
    await store.reload();
    onClose();
  }

  const title = editing
    ? "Editar lançamento"
    : planned
      ? "Conta fixa do mês"
      : kind === "expense"
        ? "Nova despesa"
        : "Nova receita";

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Segmented
          label="Tipo"
          value={kind}
          onChange={switchKind}
          options={[
            { value: "expense", label: "Despesa" },
            { value: "income", label: "Receita" },
          ]}
        />
        <MoneyField
          label={repeat === "installments" ? (isTotal ? "Valor total" : "Valor da parcela") : "Valor"}
          value={amount}
          onChange={setAmount}
          required
          autoFocus={!editing}
          hint={
            kind === "expense" && amount > 0 && hourCents > 0
              ? `Custa ${hoursFor(amount, hourCents)} do seu trabalho.`
              : undefined
          }
        />
        <label className="block">
          <span className="label">Descrição</span>
          <input
            className="field"
            required
            maxLength={120}
            placeholder={kind === "expense" ? "Ex.: Mercado, Netflix, Gasolina" : "Ex.: Freela, Venda"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div>
          <span className="label">Categoria</span>
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip"
                aria-pressed={categoryId === c.id}
                onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}
              >
                <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
            <button
              type="button"
              className="chip border-dashed"
              onClick={() => setNewCategory({ name: "", color: "#2563eb" })}
            >
              <RiAddLine className="size-4" /> Nova
            </button>
          </div>
          {newCategory && (
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line p-3">
              <input
                className="field"
                placeholder="Nome da categoria"
                maxLength={40}
                autoFocus
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createCategory();
                  }
                }}
              />
              <ColorPicker value={newCategory.color} onChange={(color) => setNewCategory({ ...newCategory, color })} />
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setNewCategory(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary flex-1" onClick={createCategory}>
                  Criar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">{kind === "expense" ? "Pago com" : "Recebido em"}</span>
            <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Nenhuma</option>
              {accounts
                .filter((a) => !a.archived || a.id === accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Data</span>
            <input className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="label">Entra no mês</span>
          <input
            className="field"
            type="month"
            value={effectiveMonth}
            onChange={(e) => setMonthOverride(e.target.value)}
          />
          {account?.type === "credit" && !monthOverride && (
            <span className="mt-1 block text-sm text-ink-500">
              {account.closing_day
                ? `Fatura de ${monthLabel(autoMonth)} (cartão fecha dia ${account.closing_day}).`
                : "Defina o dia de fechamento do cartão em Ajustes para acertar a fatura."}
            </span>
          )}
        </label>

        {!editing && !planned && (
          <div className="flex flex-col gap-3">
            <span className="label mb-0">Repetição</span>
            <Segmented
              label="Repetição"
              value={repeat}
              onChange={setRepeat}
              options={[
                { value: "once", label: "Uma vez" },
                { value: "installments", label: "Parcelado" },
                { value: "monthly", label: "Todo mês" },
              ]}
            />
            {repeat === "installments" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">Parcelas</span>
                    <input
                      className="field"
                      type="number"
                      min={2}
                      max={120}
                      value={count}
                      onChange={(e) => {
                        const n = Math.max(2, Math.min(120, Number(e.target.value) || 2));
                        setCount(n);
                        setFirst((f) => Math.min(f, n));
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="label">Começa na parcela</span>
                    <input
                      className="field"
                      type="number"
                      min={1}
                      max={count}
                      value={first}
                      onChange={(e) => setFirst(Math.max(1, Math.min(count, Number(e.target.value) || 1)))}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isTotal} onChange={(e) => setIsTotal(e.target.checked)} />
                  O valor informado é o total da compra
                </label>
                <p className="text-sm text-ink-500">
                  {first > 1 ? `Já paga até a ${first - 1}ª. ` : ""}
                  Cria {count - first + 1} parcela(s) de {monthLabel(effectiveMonth)} a{" "}
                  {monthLabel(addMonths(effectiveMonth, count - first))}
                  {amount > 0 && `, ${brl(isTotal ? Math.ceil(amount / count) : amount)} cada`}.
                </p>
              </>
            )}
            {repeat === "monthly" && (
              <label className="block">
                <span className="label">Até (opcional)</span>
                <input
                  className="field"
                  type="month"
                  min={effectiveMonth}
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                />
                <span className="mt-1 block text-sm text-ink-500">
                  Conta fixa: aparece todo mês a partir de {monthLabel(effectiveMonth)}, como assinaturas e aluguel.
                </span>
              </label>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <span className="label mb-0">Envolve outra pessoa?</span>
          <Segmented
            label="Pessoa"
            value={personMode}
            onChange={setPersonMode}
            options={[
              { value: "none", label: "Não" },
              { value: "person", label: kind === "expense" ? "Devo a alguém" : "Alguém me deve" },
            ]}
          />
          {personMode === "person" && (
            <>
              <input
                className="field"
                list="people"
                placeholder="Nome da pessoa"
                maxLength={60}
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              />
              <datalist id="people">
                {people.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </>
          )}
        </div>

        {repeat !== "monthly" && (
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" className="size-4" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            {kind === "expense" ? "Já está pago" : "Já recebi"}
          </label>
        )}
        {editing && draft.group_id && (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={applyGroup} onChange={(e) => setApplyGroup(e.target.checked)} />
            Aplicar descrição, categoria, conta e pessoa a todas as parcelas
          </label>
        )}

        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary" disabled={busy}>
          {busy ? "Salvando…" : planned ? "Lançar neste mês" : "Salvar"}
        </button>
        {planned && (
          <button type="button" className="btn-secondary" disabled={busy} onClick={updateRule}>
            Salvar para todos os meses
          </button>
        )}
        {(editing || planned) && (
          <button type="button" className="btn-ghost text-neg" onClick={remove}>
            <RiDeleteBinLine className="size-5" /> Excluir
          </button>
        )}
      </form>
    </Sheet>
  );
}
