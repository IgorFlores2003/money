import { useEffect, useRef, type ReactNode } from "react";
import { RiCloseLine, RiDeleteBinLine } from "react-icons/ri";

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

/** Rodapé padrão dos formulários em folha: Salvar (+ ações extras) e Excluir. */
export function FormActions({
  busy,
  saveLabel = "Salvar",
  onDelete,
  children,
}: {
  busy?: boolean;
  saveLabel?: string;
  onDelete?: () => void;
  children?: ReactNode;
}) {
  return (
    <>
      <button className="btn-primary" disabled={busy}>
        {busy ? "Salvando…" : saveLabel}
      </button>
      {children}
      {onDelete && (
        <button type="button" className="btn-ghost text-neg" disabled={busy} onClick={onDelete}>
          <RiDeleteBinLine className="size-5" /> Excluir
        </button>
      )}
    </>
  );
}
