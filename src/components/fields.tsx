import { useEffect, useRef, useState, type ReactNode } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import { addMonths, centsToInput, monthLabel, parseMoney } from "../../shared/finance";

/** Rótulo + controle + dica opcional embaixo. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-ink-500">{hint}</span>}
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  className = "text-[15px]",
  inputClassName,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <input type="checkbox" className={inputClassName} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

/** Campo de dinheiro: aceita "15", "15,50", "1.234,56". Valor em centavos. */
export function MoneyField({
  label,
  value,
  onChange,
  required,
  autoFocus,
  hint,
}: {
  label: string;
  value: number;
  onChange: (cents: number) => void;
  required?: boolean;
  autoFocus?: boolean;
  hint?: ReactNode;
}) {
  const [text, setText] = useState(centsToInput(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(centsToInput(value));
    }
  }, [value]);
  const invalid = text !== "" && parseMoney(text) === null;
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400">R$</span>
        <input
          className="field pl-10 tabular-nums"
          inputMode="decimal"
          placeholder="0,00"
          value={text}
          required={required}
          autoFocus={autoFocus}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value);
            const cents = parseMoney(e.target.value) ?? 0;
            last.current = cents;
            onChange(cents);
          }}
        />
      </div>
      {invalid ? (
        <span className="mt-1 block text-sm text-neg">Use números, ex.: 15,50</span>
      ) : (
        hint && <span className="mt-1 block text-sm text-ink-500">{hint}</span>
      )}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-page p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            value === o.value ? "bg-card text-ink-900 shadow-sm" : "text-ink-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button className="icon-btn" aria-label="Mês anterior" onClick={() => onChange(addMonths(month, -1))}>
        <RiArrowLeftSLine className="size-6" />
      </button>
      <span className="min-w-36 text-center font-semibold">{monthLabel(month)}</span>
      <button className="icon-btn" aria-label="Próximo mês" onClick={() => onChange(addMonths(month, 1))}>
        <RiArrowRightSLine className="size-6" />
      </button>
    </div>
  );
}

export const COLORS = [
  "#0f7a4a", "#16a34a", "#0d9488", "#2563eb", "#4f46e5", "#7c3aed",
  "#9333ea", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#71717a",
];
export const DEFAULT_CATEGORY_COLOR = "#2563eb";
export const DEFAULT_ACCOUNT_COLOR = "#7c3aed";

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={`size-8 rounded-full ring-offset-2 ring-offset-card ${value === c ? "ring-2 ring-ink-900" : ""}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
