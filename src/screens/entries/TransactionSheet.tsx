import { useState, type FormEvent } from "react";
import { addMonths, billingMonth, hourValueCents, hoursFor, monthLabel, todayISO, type Kind } from "../../../shared/finance";
import { del, post, put } from "../../api";
import { ask, Checkbox, ErrorNote, Field, FormActions, MoneyField, Segmented, Sheet } from "../../components";
import { useAction } from "../../hooks/useAction";
import type { Draft } from "../../navigation";
import { useStore } from "../../store";
import CategoryPicker from "./CategoryPicker";
import PersonField from "./PersonField";
import RepeatFields, { REPEAT_ONCE, type Repeat } from "./RepeatFields";

/** Novo lançamento, edição de um lançado ou de uma conta fixa prevista no mês. */
export default function TransactionSheet({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { categories, accounts, month, profile, recurrences, reload } = useStore();
  const editing = Boolean(draft.id && !draft.planned);
  const planned = Boolean(draft.planned);

  const [kind, setKind] = useState<Kind>(draft.kind ?? "expense");
  const [amount, setAmount] = useState(draft.amount_cents ?? 0);
  const [description, setDescription] = useState(draft.description ?? "");
  const [categoryId, setCategoryId] = useState(draft.category_id ?? "");
  const [accountId, setAccountId] = useState(
    draft.account_id ?? (editing || planned ? "" : (accounts.find((a) => !a.archived)?.id ?? "")),
  );
  // Lançamento novo num mês diferente do atual começa no dia 1 daquele mês.
  const [date, setDate] = useState(draft.date ?? (todayISO().startsWith(month) ? todayISO() : `${month}-01`));
  const [monthOverride, setMonthOverride] = useState(draft.month && editing ? draft.month : "");
  const [person, setPerson] = useState<string | null>(draft.person ?? null);
  const [paid, setPaid] = useState(draft.paid ?? false);
  const [repeat, setRepeat] = useState<Repeat>(REPEAT_ONCE);
  const [applyGroup, setApplyGroup] = useState(true);
  const { busy, error, setError, run } = useAction();

  const account = accounts.find((a) => a.id === accountId);
  const autoMonth = billingMonth(date, account);
  const effectiveMonth = monthOverride || autoMonth;
  const hourCents = hourValueCents(profile);
  const rule = recurrences.find((r) => r.id === draft.recurrence_id);

  function switchKind(k: Kind) {
    setKind(k);
    if (categories.find((c) => c.id === categoryId)?.kind !== k) setCategoryId("");
  }

  /** Campos comuns a lançamento e conta fixa. */
  function commonFields() {
    const name = person?.trim() || null;
    if (person !== null && !name) throw new Error("Informe o nome da pessoa.");
    return {
      kind,
      amount_cents: amount,
      description,
      category_id: categoryId || null,
      account_id: accountId || null,
      person: name,
    };
  }

  const finish = async () => {
    await reload();
    onClose();
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) return setError("Informe um valor maior que zero.");
    void run(async () => {
      const fields = commonFields();
      if (editing) {
        await put(`transactions/${draft.id}`, {
          ...fields,
          date,
          month: effectiveMonth,
          paid,
          apply_to_group: applyGroup,
        });
      } else if (repeat.mode === "monthly" && !planned) {
        await post("recurrences", {
          ...fields,
          day: Number(date.slice(8, 10)),
          start_month: effectiveMonth,
          end_month: repeat.endMonth || null,
        });
      } else {
        await post("transactions", {
          ...fields,
          date,
          month: effectiveMonth,
          paid,
          recurrence_id: planned ? draft.recurrence_id : null,
          ...(repeat.mode === "installments" && {
            installments: repeat.count,
            first_installment: repeat.first,
            amount_is_total: repeat.isTotal,
          }),
        });
      }
      await finish();
    });
  }

  /** Conta fixa: muda a regra para todos os meses, não só este. */
  const updateRule = () =>
    run(async () => {
      if (!draft.recurrence_id) return;
      await put(`recurrences/${draft.recurrence_id}`, {
        ...commonFields(),
        day: Number(date.slice(8, 10)),
        start_month: rule?.start_month ?? month,
        end_month: rule?.end_month ?? null,
      });
      await finish();
    });

  async function remove() {
    if (planned && draft.recurrence_id) {
      const choice = await ask(
        `Excluir “${draft.description}”?`,
        [
          { label: `Parar a partir de ${monthLabel(month)}`, value: "stop", danger: true },
          { label: "Excluir de todos os meses", value: "all", danger: true },
        ],
        "É uma conta fixa. Os meses já lançados continuam como estão.",
      );
      if (!choice) return;
      await run(async () => {
        if (choice === "all" || !rule || rule.start_month >= month) await del(`recurrences/${draft.recurrence_id}`);
        else await put(`recurrences/${rule.id}`, { ...rule, end_month: addMonths(month, -1) });
        await finish();
      });
      return;
    }
    const options = draft.group_id
      ? [
          { label: "Só esta parcela", value: "one", danger: true },
          { label: "Esta e as próximas", value: "next", danger: true },
          { label: "Todas as parcelas", value: "group", danger: true },
        ]
      : [{ label: "Excluir", value: "one", danger: true }];
    const choice = await ask(`Excluir “${draft.description}”?`, options);
    if (!choice) return;
    await run(async () => {
      await del(`transactions/${draft.id}${choice === "one" ? "" : `?scope=${choice}`}`);
      await finish();
    });
  }

  const title = editing
    ? "Editar lançamento"
    : planned
      ? "Conta fixa do mês"
      : kind === "expense"
        ? "Nova despesa"
        : "Nova receita";
  const amountLabel =
    repeat.mode === "installments" ? (repeat.isTotal ? "Valor total" : "Valor da parcela") : "Valor";

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
          label={amountLabel}
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
        <Field label="Descrição">
          <input
            className="field"
            required
            maxLength={120}
            placeholder={kind === "expense" ? "Ex.: Mercado, Netflix, Gasolina" : "Ex.: Freela, Venda"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <CategoryPicker kind={kind} value={categoryId} onChange={setCategoryId} onError={setError} />

        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "expense" ? "Pago com" : "Recebido em"}>
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
          </Field>
          <Field label="Data">
            <input className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field
          label="Entra no mês"
          hint={
            account?.type === "credit" && !monthOverride
              ? account.closing_day
                ? `Fatura de ${monthLabel(autoMonth)} (cartão fecha dia ${account.closing_day}).`
                : "Defina o dia de fechamento do cartão em Ajustes para acertar a fatura."
              : undefined
          }
        >
          <input
            className="field"
            type="month"
            value={effectiveMonth}
            onChange={(e) => setMonthOverride(e.target.value)}
          />
        </Field>

        {!editing && !planned && (
          <RepeatFields value={repeat} onChange={setRepeat} month={effectiveMonth} amount={amount} />
        )}

        <PersonField kind={kind} value={person} onChange={setPerson} />

        {repeat.mode !== "monthly" && (
          <Checkbox checked={paid} onChange={setPaid} inputClassName="size-4">
            {kind === "expense" ? "Já está pago" : "Já recebi"}
          </Checkbox>
        )}
        {editing && draft.group_id && (
          <Checkbox className="text-sm text-ink-700" checked={applyGroup} onChange={setApplyGroup}>
            Aplicar descrição, categoria, conta e pessoa a todas as parcelas
          </Checkbox>
        )}

        <ErrorNote>{error}</ErrorNote>
        <FormActions
          busy={busy}
          saveLabel={planned ? "Lançar neste mês" : "Salvar"}
          onDelete={editing || planned ? remove : undefined}
        >
          {planned && (
            <button type="button" className="btn-secondary" disabled={busy} onClick={updateRule}>
              Salvar para todos os meses
            </button>
          )}
        </FormActions>
      </form>
    </Sheet>
  );
}
