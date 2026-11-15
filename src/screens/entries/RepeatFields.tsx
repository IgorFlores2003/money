import { addMonths, brl, monthLabel } from "../../../shared/finance";
import { Checkbox, Field, Segmented } from "../../components";

export interface Repeat {
  mode: "once" | "installments" | "monthly";
  /** Parcelado: total de parcelas e a primeira a lançar (compra já em andamento). */
  count: number;
  first: number;
  /** Parcelado: o valor digitado é o total da compra, não o da parcela. */
  isTotal: boolean;
  /** Todo mês: último mês (vazio = sem fim). */
  endMonth: string;
}

export const REPEAT_ONCE: Repeat = { mode: "once", count: 2, first: 1, isTotal: false, endMonth: "" };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Uma vez, parcelado ou conta fixa todo mês. */
export default function RepeatFields({
  value: r,
  onChange,
  month,
  amount,
}: {
  value: Repeat;
  onChange: (r: Repeat) => void;
  /** Mês em que o lançamento entra. */
  month: string;
  amount: number;
}) {
  const set = (patch: Partial<Repeat>) => onChange({ ...r, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <span className="label mb-0">Repetição</span>
      <Segmented
        label="Repetição"
        value={r.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "once", label: "Uma vez" },
          { value: "installments", label: "Parcelado" },
          { value: "monthly", label: "Todo mês" },
        ]}
      />
      {r.mode === "installments" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parcelas">
              <input
                className="field"
                type="number"
                min={2}
                max={120}
                value={r.count}
                onChange={(e) => {
                  const count = clamp(Number(e.target.value) || 2, 2, 120);
                  set({ count, first: Math.min(r.first, count) });
                }}
              />
            </Field>
            <Field label="Começa na parcela">
              <input
                className="field"
                type="number"
                min={1}
                max={r.count}
                value={r.first}
                onChange={(e) => set({ first: clamp(Number(e.target.value) || 1, 1, r.count) })}
              />
            </Field>
          </div>
          <Checkbox className="text-sm" checked={r.isTotal} onChange={(isTotal) => set({ isTotal })}>
            O valor informado é o total da compra
          </Checkbox>
          <p className="text-sm text-ink-500">
            {r.first > 1 ? `Já paga até a ${r.first - 1}ª. ` : ""}
            Cria {r.count - r.first + 1} parcela(s) de {monthLabel(month)} a{" "}
            {monthLabel(addMonths(month, r.count - r.first))}
            {amount > 0 && `, ${brl(r.isTotal ? Math.ceil(amount / r.count) : amount)} cada`}.
          </p>
        </>
      )}
      {r.mode === "monthly" && (
        <Field
          label="Até (opcional)"
          hint={`Conta fixa: aparece todo mês a partir de ${monthLabel(month)}, como assinaturas e aluguel.`}
        >
          <input
            className="field"
            type="month"
            min={month}
            value={r.endMonth}
            onChange={(e) => set({ endMonth: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}
