import { useCallback, useRef, useState } from "react";

/**
 * Estado de uma ação assíncrona (salvar, excluir…): evita clique duplo,
 * mostra "Salvando…" e transforma a exceção em mensagem de erro.
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);

  /** Executa fn; devolve true se deu certo. */
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
