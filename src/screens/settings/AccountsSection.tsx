import { useState, type FormEvent } from "react";
import { RiAddLine } from "react-icons/ri";
import type { Account } from "../../../shared/finance";
import { del, post, put } from "../../api";
import {
  Checkbox,
  ColorPicker,
  confirmDelete,
  DEFAULT_ACCOUNT_COLOR,
  Dot,
  ErrorNote,
  Field,
  FormActions,
  Segmented,
  Sheet,
} from "../../components";
import { useAction } from "../../hooks/useAction";
import { useStore } from "../../store";

function typeLabel(a: Account) {
  if (a.type === "credit") return a.closing_day ? `Cartão · fecha dia ${a.closing_day}` : "Cartão · sem fechamento";
  return a.type === "cash" ? "Dinheiro" : "Débito / Pix";
}

export default function AccountsSection() {
  const { accounts } = useStore();
  const [editing, setEditing] = useState<Partial<Account> | null>(null);

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Contas e cartões</h2>
        <button
          className="btn-ghost px-2 py-1 text-sm"
          onClick={() => setEditing({ type: "credit", color: DEFAULT_ACCOUNT_COLOR })}
        >
          <RiAddLine className="size-4" /> Nova
        </button>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {accounts.map((a) => (
          <li key={a.id}>
            <button
              className={`flex w-full items-center gap-3 py-3 text-left ${a.archived ? "opacity-50" : ""}`}
              onClick={() => setEditing(a)}
            >
              <Dot color={a.color} />
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="text-sm text-ink-500">{typeLabel(a)}</span>
            </button>
          </li>
        ))}
      </ul>
      {editing && <AccountSheet item={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function AccountSheet({ item, onClose }: { item: Partial<Account>; onClose: () => void }) {
  const { reload, reloadMeta } = useStore();
  const [name, setName] = useState(item.name ?? "");
  const [type, setType] = useState<Account["type"]>(item.type ?? "debit");
  const [closing, setClosing] = useState(item.closing_day ? String(item.closing_day) : "");
  const [color, setColor] = useState(item.color ?? DEFAULT_ACCOUNT_COLOR);
  const [archived, setArchived] = useState(item.archived ?? false);
  const { busy, error, run } = useAction();

  function submit(e: FormEvent) {
    e.preventDefault();
    const body = { name, type, color, archived, closing_day: closing ? Number(closing) : null };
    void run(async () => {
      if (item.id) await put(`accounts/${item.id}`, body);
      else await post("accounts", body);
      await reloadMeta();
      onClose();
    });
  }

  async function remove() {
    if (!(await confirmDelete(`Excluir “${item.name}”?`, "Os lançamentos ficam “Sem conta”."))) return;
    await run(async () => {
      await del(`accounts/${item.id}`);
      await Promise.all([reloadMeta(), reload()]);
      onClose();
    });
  }

  return (
    <Sheet title={item.id ? "Editar conta" : "Nova conta ou cartão"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nome">
          <input
            className="field"
            required
            maxLength={40}
            autoFocus
            placeholder="Ex.: Nubank"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Segmented
          label="Tipo"
          value={type}
          onChange={setType}
          options={[
            { value: "credit", label: "Cartão de crédito" },
            { value: "debit", label: "Débito / Pix" },
            { value: "cash", label: "Dinheiro" },
          ]}
        />
        {type === "credit" && (
          <Field label="Dia de fechamento da fatura" hint="Compras a partir desse dia entram na fatura do mês seguinte.">
            <input
              className="field"
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
            />
          </Field>
        )}
        <ColorPicker value={color} onChange={setColor} />
        {item.id && (
          <Checkbox checked={archived} onChange={setArchived}>
            Arquivar
          </Checkbox>
        )}
        <ErrorNote>{error}</ErrorNote>
        <FormActions busy={busy} onDelete={item.id ? remove : undefined} />
      </form>
    </Sheet>
  );
}
