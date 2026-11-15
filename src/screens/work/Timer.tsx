import { useEffect, useState } from "react";
import { RiPauseFill, RiPlayFill } from "react-icons/ri";
import { brl, hms, todayISO, type Profile } from "../../../shared/finance";
import { post } from "../../api";
import { ErrorNote } from "../../components";
import { useAction } from "../../hooks/useAction";
import { useStore } from "../../store";

/** Segundos desde `started`, atualizado a cada segundo enquanto conta. */
function useElapsed(started: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [started]);
  return started ? Math.max(0, (now - new Date(started).getTime()) / 1000) : 0;
}

/** Cronômetro salvo na conta: dá para começar no celular e parar no computador. */
export default function Timer() {
  const { profile, setProfile, reload } = useStore();
  const started = profile.timer_started_at;
  const elapsed = useElapsed(started);
  const { busy, error, run } = useAction();

  const toggle = () =>
    run(async () => {
      if (!started) return setProfile(await post<Profile>("timer/start"));
      const r = await post<{ profile: Profile }>("timer/stop", { date: todayISO(new Date(started)) });
      setProfile(r.profile);
      await reload();
    });

  return (
    <>
      <section className="card flex items-center gap-4">
        <button
          className={`flex size-16 shrink-0 items-center justify-center rounded-full text-white ${started ? "bg-neg" : "bg-brand-600"}`}
          aria-label={started ? "Parar e salvar" : "Começar a contar"}
          disabled={busy}
          onClick={toggle}
        >
          {started ? <RiPauseFill className="size-8" /> : <RiPlayFill className="size-8" />}
        </button>
        <div>
          <p className="text-3xl font-bold tabular-nums">{hms(elapsed)}</p>
          <p className="text-sm text-ink-500">
            {started
              ? `Contando desde ${new Date(started).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${brl(Math.round((elapsed * profile.hourly_rate_cents) / 3600))}`
              : "Toque para começar a contar o tempo de serviço."}
          </p>
        </div>
      </section>
      <ErrorNote>{error}</ErrorNote>
    </>
  );
}
