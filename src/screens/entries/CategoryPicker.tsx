import { useState } from "react";
import { RiAddLine } from "react-icons/ri";
import type { Category, Kind } from "../../../shared/finance";
import { post } from "../../api";
import { ColorPicker, DEFAULT_CATEGORY_COLOR } from "../../components";
import { useStore } from "../../store";

/** Chips de categoria do tipo escolhido + criação de categoria sem sair do formulário. */
export default function CategoryPicker({
  kind,
  value,
  onChange,
  onError,
}: {
  kind: Kind;
  value: string;
  onChange: (id: string) => void;
  onError: (message: string) => void;
}) {
  const { categories, reloadMeta } = useStore();
  const [creating, setCreating] = useState<{ name: string; color: string } | null>(null);
  const visible = categories.filter((c) => c.kind === kind && (!c.archived || c.id === value));

  async function create() {
    if (!creating?.name.trim()) return;
    try {
      const c = await post<Category>("categories", { kind, ...creating });
      await reloadMeta();
      onChange(c.id);
      setCreating(null);
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div>
      <span className="label">Categoria</span>
      <div className="flex flex-wrap gap-2">
        {visible.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            aria-pressed={value === c.id}
            onClick={() => onChange(value === c.id ? "" : c.id)}
          >
            <span className="size-2.5 rounded-full" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
        <button
          type="button"
          className="chip border-dashed"
          onClick={() => setCreating({ name: "", color: DEFAULT_CATEGORY_COLOR })}
        >
          <RiAddLine className="size-4" /> Nova
        </button>
      </div>
      {creating && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line p-3">
          <input
            className="field"
            placeholder="Nome da categoria"
            maxLength={40}
            autoFocus
            value={creating.name}
            onChange={(e) => setCreating({ ...creating, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
            }}
          />
          <ColorPicker value={creating.color} onChange={(color) => setCreating({ ...creating, color })} />
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setCreating(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary flex-1" onClick={create}>
              Criar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
