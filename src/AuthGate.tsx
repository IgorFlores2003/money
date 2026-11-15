import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { RiMoneyDollarCircleLine, RiShieldCheckLine } from "react-icons/ri";
import AccountAccess from "./AccountAccess";
import App from "./App";
import { supabase } from "./supabase";
import { Spinner } from "./ui";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Spinner label="Verificando sua sessão…" />;
  const confirmed = Boolean(session?.user.email_confirmed_at);
  if (session && confirmed && !recovery) return <App key={session.user.id} user={session.user} />;

  return (
    <div className="flex min-h-dvh bg-card">
      <aside className="hidden w-[40%] max-w-xl flex-col justify-between bg-[#0f7a4a] p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <RiMoneyDollarCircleLine className="size-8" /> Sobra
        </div>
        <p className="max-w-xs text-lg leading-relaxed">
          Horas trabalhadas, salário, receitas e dívidas no mesmo lugar. E quanto sobra no fim do mês.
        </p>
        <p className="flex items-center gap-2 text-sm opacity-80">
          <RiShieldCheckLine className="size-5" /> Cada conta só vê os próprios dados.
        </p>
      </aside>
      <main className="flex flex-1 justify-center px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:items-center">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 text-2xl font-bold lg:hidden">
            <RiMoneyDollarCircleLine className="size-8 text-brand-600" /> Sobra
          </div>
          {!supabase ? (
            <p className="text-ink-500">
              Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.
            </p>
          ) : (
            <AccountAccess
              key={session?.user.email ?? ""}
              initialEmail={session && !confirmed ? session.user.email ?? "" : ""}
              recovery={recovery}
              onRecovered={() => setRecovery(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
