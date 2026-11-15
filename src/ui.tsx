import { useEffect, useRef, useState, type ReactNode } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine } from "react-icons/ri";
import { addMonths, centsToInput, monthLabel, parseMoney } from "../shared/finance";

/** Folha inferior no celular, janela no computador. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=alertdialog]")) close.current();
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="max-h-[calc(100dvh-24px-env(safe-area-inset-top))] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-card px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-2xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="sheet-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" className="icon-btn -mr-2" aria-label="Fechar" onClick={onClose}>
            <RiCloseLine className="size-6" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

// ---------- Confirmação ----------

type Ask = {
  title: string;
  message?: string;
  actions: { label: string; value: string; danger?: boolean }[];
  resolve: (v: string | null) => void;
};
let show: ((a: Ask | null) => void) | null = null;

/** Pergunta com botões; resolve com o value escolhido ou null. */
export function ask(title: string, actions: Ask["actions"], message?: string) {
  return new Promise<string | null>((resolve) =>
    show ? show({ title, message, actions, resolve }) : resolve(null),
  );
}
export const confirmDelete = async (title: string, message?: string) =>
  (await ask(title, [{ label: "Excluir", value: "yes", danger: true }], message)) === "yes";

export function ConfirmHost() {
  const [current, setCurrent] = useState<Ask | null>(null);
  useEffect(() => {
    show = setCurrent;
    return () => {
      show = null;
    };
  }, []);
  if (!current) return null;
  const done = (v: string | null) => {
    current.resolve(v);
    setCurrent(null);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && done(null)}
      onKeyDown={(e) => e.key === "Escape" && done(null)}
    >
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-card p-5">
        <h2 className="text-lg font-semibold">{current.title}</h2>
        {current.message && <p className="mt-2 text-[15px] text-ink-500">{current.message}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {current.actions.map((a, i) => (
            <button
              key={a.value}
              autoFocus={i === 0}
              className={a.danger ? "btn-danger" : "btn-primary"}
              onClick={() => done(a.value)}
            >
              {a.label}
            </button>
          ))}
          <button className="btn-ghost" onClick={() => done(null)}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Campos ----------

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

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-neg-50 p-3 text-sm text-neg">
      {children}
    </p>
  );
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-ink-500">
      <span className="size-5 animate-spin rounded-full border-2 border-line border-t-brand-600" />
      {label}
    </div>
  );
}

export const COLORS = [
  "#0f7a4a", "#16a34a", "#0d9488", "#2563eb", "#4f46e5", "#7c3aed",
  "#9333ea", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#71717a",
];

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

export const Dot = ({ color }: { color: string }) => (
  <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color }} />
);
