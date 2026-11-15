import { useRef, useState } from "react";
import { RiAlertLine, RiCameraLine, RiImageAddLine } from "react-icons/ri";
import {
  brl,
  centsToInput,
  monthLabel,
  parseMoney,
  todayISO,
  type Category,
  type Entry,
  type Kind,
} from "../../../shared/finance";
import { api, post } from "../../api";
import { Checkbox, DEFAULT_CATEGORY_COLOR, ErrorNote, Sheet, Spinner } from "../../components";
import { useAction } from "../../hooks/useAction";
import { photoToBase64 } from "../../image";
import { useStore } from "../../store";

/** Como a API devolve cada item lido da foto. */
interface PhotoItem {
  kind: Kind;
  description: string;
  amount_cents: number;
  category: string | null;
  account: string | null;
  installment: number | null;
  installments: number | null;
  person: string | null;
  date: string | null;
}

/** Linha da revisão: o que a pessoa vai confirmar. */
interface Row {
  key: number;
  include: boolean;
  kind: Kind;
  description: string;
  amount: number;
  /** id de categoria existente, "new:Nome" para criar, ou "" para nenhuma. */
  category: string;
  account: string;
  installment: number | null;
  installments: number | null;
  person: string | null;
  date: string | null;
  warning: string;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Transforma o que a IA leu em linhas editáveis, já ligando nomes a categorias/contas e marcando repetidos. */
function toRows(items: PhotoItem[], categories: Category[], accounts: { id: string; name: string }[], existing: Entry[]): Row[] {
  const seen: PhotoItem[] = [];
  return items.map((it, key) => {
    const cat = it.category
      ? categories.find((c) => c.kind === it.kind && !c.archived && norm(c.name) === norm(it.category!))
      : undefined;
    const acc = it.account ? accounts.find((a) => norm(a.name) === norm(it.account!)) : undefined;

    let warning = "";
    const twin = seen.find((s) => s.amount_cents === it.amount_cents && s.installment === it.installment && s.kind === it.kind);
    if (twin) warning = `Pode ser repetido de “${twin.description}” (mesmo valor).`;
    const already = existing.find(
      (e) =>
        e.amount_cents === it.amount_cents &&
        !e.planned &&
        (norm(e.description).includes(norm(it.description)) || norm(it.description).includes(norm(e.description))),
    );
    if (already) warning = `Já existe “${already.description}” com esse valor neste mês.`;
    seen.push(it);

    return {
      key,
      include: !warning,
      kind: it.kind,
      description: it.description,
      amount: it.amount_cents,
      category: cat ? cat.id : it.category ? `new:${it.category}` : "",
      account: acc?.id ?? "",
      installment: it.installment,
      installments: it.installments,
      person: it.person,
      date: it.date,
      warning,
    };
  });
}

/** Lançar várias despesas e receitas de uma foto (planilha, extrato, nota), conferindo antes. */
export default function PhotoImport({ onClose }: { onClose: () => void }) {
  const { categories, accounts, month, entries, reload, reloadMeta } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [target, setTarget] = useState(month);
  const [paid, setPaid] = useState(false);
  const [progress, setProgress] = useState("");
  const reading = useAction();
  const saving = useAction();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const read = (file: File | undefined) =>
    file &&
    reading.run(async () => {
      const photo = await photoToBase64(file);
      const { items } = await api<{ items: PhotoItem[] }>("import/photo", {
        method: "POST",
        body: { image: photo.data, mime_type: photo.mimeType },
      });
      if (!items.length) throw new Error("Não encontrei despesas nem receitas nessa foto. Tente outra mais nítida.");
      setRows(toRows(items, categories, accounts, entries));
    });

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs!.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const chosen = rows?.filter((r) => r.include) ?? [];
  const invalid = chosen.some((r) => !r.description.trim() || r.amount <= 0);
  const total = chosen.reduce((t, r) => t + (r.kind === "income" ? r.amount : -r.amount), 0);

  const save = () =>
    saving.run(async () => {
      // Categorias novas sugeridas pela foto: cria uma vez cada.
      const created = new Map<string, string>();
      for (const r of chosen.filter((r) => r.category.startsWith("new:"))) {
        const id = `${r.kind}:${norm(r.category.slice(4))}`;
        if (created.has(id)) continue;
        const c = await post<Category>("categories", { kind: r.kind, name: r.category.slice(4), color: DEFAULT_CATEGORY_COLOR });
        created.set(id, c.id);
      }
      const date = todayISO().startsWith(target) ? todayISO() : `${target}-01`;
      let done = 0;
      for (const r of chosen) {
        setProgress(`Lançando ${done + 1} de ${chosen.length}…`);
        await post("transactions", {
          kind: r.kind,
          amount_cents: r.amount,
          description: r.description.trim(),
          category_id: r.category.startsWith("new:")
            ? created.get(`${r.kind}:${norm(r.category.slice(4))}`)
            : r.category || null,
          account_id: r.account || null,
          person: r.person,
          date: r.date ?? date,
          month: target,
          paid,
          ...(r.installments && { installments: r.installments, first_installment: r.installment }),
        });
        done++;
        // Já lançado sai da lista: se der erro no meio, tentar de novo não duplica.
        setRows((rs) => rs!.filter((x) => x.key !== r.key));
      }
      if (created.size) await reloadMeta();
      await reload();
      onClose();
    }).finally(() => setProgress(""));

  return (
    <Sheet title="Lançar por foto" onClose={onClose}>
      {/* Dois inputs: um abre a câmera direto, o outro a galeria. */}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => read(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => read(e.target.files?.[0])} />

      {reading.busy ? (
        <Spinner label="Lendo a foto… pode levar uns 15 segundos." />
      ) : !rows ? (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-ink-700">
            Envie a foto de uma planilha, extrato, fatura ou anotação. Eu leio as despesas e receitas e você confere tudo
            antes de lançar.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary flex-col py-5" onClick={() => camera.current?.click()}>
              <RiCameraLine className="size-7" /> Tirar foto
            </button>
            <button className="btn-secondary flex-col py-5" onClick={() => gallery.current?.click()}>
              <RiImageAddLine className="size-7" /> Escolher imagem
            </button>
          </div>
          <ErrorNote>{reading.error}</ErrorNote>
          <p className="text-xs text-ink-500">
            A imagem é enviada ao Google Gemini só para a leitura e não fica guardada no Meu DimDim.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Encontrei {rows.length} item(ns). Confira, corrija o que precisar e desmarque o que não for lançar.
          </p>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <ReviewRow key={r.key} row={r} onChange={(patch) => update(r.key, patch)} />
            ))}
          </ul>

          <div className="flex flex-col gap-3 rounded-xl bg-page p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Lançar no mês</span>
              <input className="field w-44" type="month" required value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <Checkbox className="text-sm" inputClassName="size-4" checked={paid} onChange={setPaid}>
              Marcar como já pagos/recebidos
            </Checkbox>
            <p className="text-sm text-ink-500">
              Parcelados criam as parcelas restantes a partir de {monthLabel(target)} (ex.: 8/12 cria da 8ª à 12ª).
            </p>
          </div>

          <ErrorNote>{saving.error}</ErrorNote>
          <button className="btn-primary" disabled={saving.busy || !chosen.length || invalid || !target} onClick={save}>
            {saving.busy
              ? progress || "Salvando…"
              : `Lançar ${chosen.length} item(ns) · ${total < 0 ? "−" : "+"}${brl(Math.abs(total))}`}
          </button>
          <button className="btn-ghost" disabled={saving.busy} onClick={() => setRows(null)}>
            Ler outra foto
          </button>
        </div>
      )}
    </Sheet>
  );
}

function ReviewRow({ row: r, onChange }: { row: Row; onChange: (patch: Partial<Row>) => void }) {
  const { categories, accounts } = useStore();
  const [amountText, setAmountText] = useState(centsToInput(r.amount));
  const options = categories.filter((c) => c.kind === r.kind && !c.archived);
  const newName = r.category.startsWith("new:") ? r.category.slice(4) : "";

  return (
    <li className={`rounded-xl border border-line p-3 ${r.include ? "" : "opacity-55"}`}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="size-5 shrink-0"
          aria-label={`Lançar ${r.description}`}
          checked={r.include}
          onChange={(e) => onChange({ include: e.target.checked })}
        />
        <input
          className="field min-w-0 flex-1 py-2"
          aria-label="Descrição"
          maxLength={120}
          value={r.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <div className="relative w-28 shrink-0">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-ink-400">R$</span>
          <input
            className="field py-2 pl-8 text-right tabular-nums"
            aria-label="Valor"
            inputMode="decimal"
            value={amountText}
            aria-invalid={parseMoney(amountText) === null}
            onChange={(e) => {
              setAmountText(e.target.value);
              onChange({ amount: parseMoney(e.target.value) ?? 0 });
            }}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-7 text-sm">
        <button
          type="button"
          className={`chip py-1 ${r.kind === "income" ? "text-pos" : "text-neg"}`}
          onClick={() => onChange({ kind: r.kind === "income" ? "expense" : "income", category: "" })}
          title="Trocar entre despesa e receita"
        >
          {r.kind === "income" ? "Receita" : "Despesa"}
        </button>
        <select
          className="field w-auto py-1 text-sm"
          aria-label="Categoria"
          value={r.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          <option value="">Sem categoria</option>
          {newName && <option value={r.category}>Nova: {newName}</option>}
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="field w-auto py-1 text-sm"
          aria-label="Conta ou cartão"
          value={r.account}
          onChange={(e) => onChange({ account: e.target.value })}
        >
          <option value="">Sem conta</option>
          {accounts
            .filter((a) => !a.archived)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        {r.installments && (
          <span className="rounded-full bg-page px-2 py-1 text-xs font-medium text-ink-700">
            parcela {r.installment}/{r.installments}
          </span>
        )}
      </div>
      {r.warning && (
        <p className="mt-2 flex items-center gap-1.5 pl-7 text-xs text-warn-800">
          <RiAlertLine className="size-4 shrink-0" /> {r.warning}
        </p>
      )}
    </li>
  );
}
