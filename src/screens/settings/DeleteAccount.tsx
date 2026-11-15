import { useState, type FormEvent } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { post } from "../../api";
import { ErrorNote, Field, Sheet } from "../../components";
import { useAction } from "../../hooks/useAction";
import { supabase } from "../../supabase";

const WORD = "EXCLUIR";

/** Exclui a conta e todos os dados de vez (exigido pelo Google Play). */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <h2 className="font-semibold">Excluir conta</h2>
      <p className="mt-1 text-sm text-ink-500">
        Apaga sua conta e todos os lançamentos, horas, categorias e contas. Não dá para desfazer.
      </p>
      <button className="btn-ghost mt-3 text-neg" onClick={() => setOpen(true)}>
        <RiDeleteBinLine className="size-5" /> Excluir minha conta
      </button>
      {open && <DeleteSheet onClose={() => setOpen(false)} />}
    </section>
  );
}

function DeleteSheet({ onClose }: { onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const { busy, error, run } = useAction();
  const ready = typed.trim().toUpperCase() === WORD;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    void run(async () => {
      await post("me/delete", { confirm: WORD });
      await supabase?.auth.signOut({ scope: "local" });
    });
  }

  return (
    <Sheet title="Excluir conta de vez?" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-[15px] text-ink-700">
          Todos os seus dados serão apagados agora e não poderão ser recuperados.
        </p>
        <Field label={`Digite ${WORD} para confirmar`}>
          <input
            className="field"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-danger" disabled={!ready || busy}>
          {busy ? "Excluindo…" : "Excluir conta e dados"}
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancelar
        </button>
      </form>
    </Sheet>
  );
}
