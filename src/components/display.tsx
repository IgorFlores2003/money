import type { ReactNode } from "react";
import { brl, type Kind } from "../../shared/finance";

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

export const Dot = ({ color }: { color: string }) => (
  <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color }} />
);

const TONES = { pos: "text-pos", neg: "text-neg", none: "" };
const STAT_SIZES = {
  sm: { label: "text-xs", value: "text-sm font-semibold sm:text-base", card: "card p-3!" },
  md: { label: "text-sm", value: "text-xl font-bold", card: "card" },
  lg: { label: "text-sm", value: "text-2xl font-bold", card: "card" },
};

/** Rótulo pequeno + número grande. Com `card`, vem dentro de um cartão. */
export function Stat({
  label,
  value,
  tone = "none",
  size = "md",
  card,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: keyof typeof TONES;
  size?: keyof typeof STAT_SIZES;
  card?: boolean;
}) {
  const s = STAT_SIZES[size];
  return (
    <div className={card ? s.card : undefined}>
      <p className={`${s.label} text-ink-500`}>{label}</p>
      <p className={`${s.value} tabular-nums ${TONES[tone]}`}>{value}</p>
    </div>
  );
}

/** Valor com sinal: +R$ para receita, −R$ para despesa. */
export function Amount({ kind, cents, className = "" }: { kind: Kind; cents: number; className?: string }) {
  return (
    <span className={`tabular-nums ${className}`}>
      {kind === "income" ? "+" : "−"}
      {brl(cents)}
    </span>
  );
}
