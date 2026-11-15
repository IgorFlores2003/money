import { useEffect, useState } from "react";

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

/** Montado uma vez na raiz; exibe as perguntas feitas por ask(). */
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
