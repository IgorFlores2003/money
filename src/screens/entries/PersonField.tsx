import { useMemo } from "react";
import type { Kind } from "../../../shared/finance";
import { Segmented } from "../../components";
import { useStore } from "../../store";

/**
 * "Envolve outra pessoa?". `value` null = não envolve; string = nome da pessoa
 * (pode estar vazio enquanto digita).
 */
export default function PersonField({
  kind,
  value,
  onChange,
}: {
  kind: Kind;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { transactions } = useStore();
  const known = useMemo(
    () => [...new Set(transactions.map((t) => t.person).filter(Boolean))] as string[],
    [transactions],
  );

  return (
    <div className="flex flex-col gap-3">
      <span className="label mb-0">Envolve outra pessoa?</span>
      <Segmented
        label="Pessoa"
        value={value === null ? "none" : "person"}
        onChange={(mode) => onChange(mode === "none" ? null : value ?? "")}
        options={[
          { value: "none", label: "Não" },
          { value: "person", label: kind === "expense" ? "Devo a alguém" : "Alguém me deve" },
        ]}
      />
      {value !== null && (
        <>
          <input
            className="field"
            list="people"
            placeholder="Nome da pessoa"
            maxLength={60}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id="people">
            {known.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </>
      )}
    </div>
  );
}
