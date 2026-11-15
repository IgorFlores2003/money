import { useState, type FormEvent } from "react";
import { RiAddLine } from "react-icons/ri";
import type { Category, Kind } from "../../../shared/finance";
import { del, post, put } from "../../api";
import {
  Checkbox,
  ColorPicker,
  confirmDelete,
  DEFAULT_CATEGORY_COLOR,
  Dot,
  ErrorNote,
  Field,
  FormActions,
  Sheet,
} from "../../components";
import { useAction } from "../../hooks/useAction";
import { useStore } from "../../store";

const KINDS: { kind: Kind; label: string }[] = [
  { kind: "expense", label: "Despesas" },
  { kind: "income", label: "Receitas" },
];

export default function CategoriesSection() {
  const { categories } = useStore();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  return (
    <section className="card">
      <h2 className="font-semibold">Categorias</h2>
      <p className="mt-1 text-sm text-ink-500">Crie quantos tipos de despesa e receita quiser.</p>
      {KINDS.map(({ kind, label }) => (
        <div key={kind} className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink-500">{label}</h3>
            <button
              className="btn-ghost px-2 py-1 text-sm"
              onClick={() => setEditing({ kind, color: DEFAULT_CATEGORY_COLOR })}
            >
              <RiAddLine className="size-4" /> Nova
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.kind === kind)
              .map((c) => (
                <button key={c.id} className={`chip ${c.archived ? "opacity-50" : ""}`} onClick={() => setEditing(c)}>
                  <Dot color={c.color} /> {c.name}
                </button>
              ))}
          </div>
        </div>
      ))}
      {editing && <CategorySheet item={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function CategorySheet({ item, onClose }: { item: Partial<Category>; onClose: () => void }) {
  const { reload, reloadMeta } = useStore();
  const [name, setName] = useState(item.name ?? "");
  const [color, setColor] = useState(item.color ?? DEFAULT_CATEGORY_COLOR);
  const [archived, setArchived] = useState(item.archived ?? false);
  const { busy, error, run } = useAction();

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      if (item.id) await put(`categories/${item.id}`, { name, color, archived });
      else await post("categories", { kind: item.kind, name, color });
      await reloadMeta();
      onClose();
    });
  }

  async function remove() {
    const ok = await confirmDelete(
      `Excluir “${item.name}”?`,
      "Os lançamentos dela ficam como “Sem categoria”. Para só esconder, use Arquivar.",
    );
    if (!ok) return;
    await run(async () => {
      await del(`categories/${item.id}`);
      await Promise.all([reloadMeta(), reload()]);
      onClose();
    });
  }

  const title = item.id
    ? "Editar categoria"
    : item.kind === "income"
      ? "Nova categoria de receita"
      : "Nova categoria de despesa";

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nome">
          <input className="field" required maxLength={40} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <ColorPicker value={color} onChange={setColor} />
        {item.id && (
          <Checkbox checked={archived} onChange={setArchived}>
            Arquivar (some das opções, mas mantém o histórico)
          </Checkbox>
        )}
        <ErrorNote>{error}</ErrorNote>
        <FormActions busy={busy} onDelete={item.id ? remove : undefined} />
      </form>
    </Sheet>
  );
}
