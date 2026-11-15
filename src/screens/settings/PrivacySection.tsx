import { useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { RiDeleteBinLine, RiDownloadLine, RiShieldUserLine } from "react-icons/ri";
import { api, post } from "../../api";
import { ErrorNote, Field, Sheet } from "../../components";
import { useAction } from "../../hooks/useAction";
import { PrivacyLink } from "../../legal/Privacy";
import { supabase } from "../../supabase";

const WORD = "EXCLUIR";

/** Direitos do titular (LGPD): ler a política, baixar os dados e excluir a conta. */
export default function PrivacySection() {
  const [deleting, setDeleting] = useState(false);
  const exporting = useAction();
  const [note, setNote] = useState("");

  const exportData = () =>
    exporting.run(async () => {
      setNote("");
      const json = JSON.stringify(await api("me/export"), null, 2);
      if (Capacitor.isNativePlatform()) {
        // O WebView do Android não baixa arquivos: copia o conteúdo.
        await navigator.clipboard.writeText(json);
        setNote("Dados copiados. Cole num e-mail ou nota para guardar, ou baixe o arquivo pelo site.");
        return;
      }
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `meu-dimdim-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  return (
    <section className="card">
      <h2 className="flex items-center gap-2 font-semibold">
        <RiShieldUserLine className="size-5 text-brand-600" /> Privacidade e dados
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        Seus dados são só seus. Veja como cuidamos deles na <PrivacyLink className="text-brand-700" />.
      </p>
      <div className="mt-3 flex flex-col items-start gap-1">
        <button className="btn-ghost -ml-3" disabled={exporting.busy} onClick={exportData}>
          <RiDownloadLine className="size-5" /> {exporting.busy ? "Preparando…" : "Baixar meus dados"}
        </button>
        <button className="btn-ghost -ml-3 text-neg" onClick={() => setDeleting(true)}>
          <RiDeleteBinLine className="size-5" /> Excluir minha conta
        </button>
      </div>
      {note && <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">{note}</p>}
      <ErrorNote>{exporting.error}</ErrorNote>
      {deleting && <DeleteSheet onClose={() => setDeleting(false)} />}
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
          Sua conta e todos os lançamentos, horas, categorias e contas serão apagados agora e não poderão ser
          recuperados. Se quiser uma cópia, use “Baixar meus dados” antes.
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
