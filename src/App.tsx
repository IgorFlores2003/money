import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  RiAddLine,
  RiExchangeDollarLine,
  RiHome5Line,
  RiMoneyDollarCircleLine,
  RiSettings3Line,
  RiTeamLine,
  RiTimerLine,
} from "react-icons/ri";
import { api } from "./api";
import {
  monthEntries,
  summarize,
  todayISO,
  type Account,
  type Category,
  type Entry,
  type Profile,
  type Recurrence,
  type Summary,
  type Transaction,
  type WorkEntry,
} from "../shared/finance";
import { ErrorNote, Spinner } from "./ui";
import Home from "./screens/Home";
import Entries from "./screens/Entries";
import Work from "./screens/Work";
import People from "./screens/People";
import Settings from "./screens/Settings";
import TransactionSheet, { type Draft } from "./screens/TransactionSheet";

export interface Store {
  user: User;
  profile: Profile & { email: string };
  setProfile: (p: Profile) => void;
  categories: Category[];
  accounts: Account[];
  month: string;
  setMonth: (m: string) => void;
  transactions: Transaction[];
  recurrences: Recurrence[];
  work: WorkEntry[];
  entries: Entry[];
  summary: Summary;
  loadingMonth: boolean;
  /** Recarrega o mês aberto. */
  reload: () => Promise<void>;
  /** Recarrega perfil, categorias e contas. */
  reloadMeta: () => Promise<void>;
  editEntry: (draft?: Draft) => void;
  go: (tab: Tab) => void;
}

const StoreContext = createContext<Store | null>(null);
export const useStore = () => useContext(StoreContext)!;

export type Tab = "home" | "entries" | "work" | "people" | "settings";
const TABS: { key: Tab; label: string; icon: typeof RiHome5Line }[] = [
  { key: "home", label: "Início", icon: RiHome5Line },
  { key: "entries", label: "Lançamentos", icon: RiExchangeDollarLine },
  { key: "work", label: "Horas", icon: RiTimerLine },
  { key: "people", label: "Pessoas", icon: RiTeamLine },
  { key: "settings", label: "Ajustes", icon: RiSettings3Line },
];

export default function App({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>(() => {
    const h = location.hash.slice(1) as Tab;
    return TABS.some((t) => t.key === h) ? h : "home";
  });
  const [profile, setProfile] = useState<Store["profile"] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [data, setData] = useState<{
    month: string;
    transactions: Transaction[];
    recurrences: Recurrence[];
    work: WorkEntry[];
  } | null>(null);
  const [error, setError] = useState("");
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);

  const reloadMeta = useCallback(async () => {
    const [p, c, a] = await Promise.all([
      api<Store["profile"]>("me"),
      api<Category[]>("categories"),
      api<Account[]>("accounts"),
    ]);
    setProfile(p);
    setCategories(c);
    setAccounts(a);
  }, []);

  const reload = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const d = await api<NonNullable<typeof data>>(`month?m=${month}`);
      setData((prev) => (d.month === month ? d : prev));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMonth(false);
    }
  }, [month]);

  useEffect(() => {
    reloadMeta().catch((e) => setError((e as Error).message));
  }, [reloadMeta]);
  useEffect(() => {
    if (profile) void reload();
  }, [reload, Boolean(profile)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    history.replaceState(null, "", tab === "home" ? location.pathname : `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab]);

  const store = useMemo<Store | null>(() => {
    if (!profile) return null;
    const transactions = data?.month === month ? data.transactions : [];
    const recurrences = data?.month === month ? data.recurrences : [];
    const work = data?.month === month ? data.work : [];
    const entries = monthEntries(month, transactions, recurrences);
    return {
      user,
      profile,
      setProfile: (p) => setProfile((old) => ({ ...old!, ...p })),
      categories,
      accounts,
      month,
      setMonth,
      transactions,
      recurrences,
      work,
      entries,
      summary: summarize(profile, entries, work, categories, accounts),
      loadingMonth: loadingMonth || data?.month !== month,
      reload,
      reloadMeta,
      editEntry: (d) => setDraft(d ?? {}),
      go: setTab,
    };
  }, [user, profile, categories, accounts, month, data, loadingMonth, reload, reloadMeta]);

  if (!store)
    return error ? (
      <div className="mx-auto max-w-sm p-6">
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary mt-4 w-full" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </div>
    ) : (
      <Spinner />
    );

  const Screen = { home: Home, entries: Entries, work: Work, people: People, settings: Settings }[tab];
  return (
    <StoreContext.Provider value={store}>
      <div className="min-h-dvh md:flex">
        <nav className="hidden w-60 shrink-0 flex-col gap-1 border-r border-line bg-card p-4 md:flex md:sticky md:top-0 md:h-dvh">
          <div className="mb-6 flex items-center gap-2 px-2 text-xl font-bold">
            <RiMoneyDollarCircleLine className="size-7 text-brand-600" /> Sobra
          </div>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium ${
                tab === t.key ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-page"
              }`}
            >
              <t.icon className="size-5" /> {t.label}
            </button>
          ))}
          <button className="btn-primary mt-4" onClick={() => store.editEntry()}>
            <RiAddLine className="size-5" /> Novo lançamento
          </button>
        </nav>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12">
          {error && (
            <div className="mb-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          <Screen />
        </main>
      </div>

      {/* Celular: barra inferior + botão de lançar. */}
      <button
        className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg md:hidden"
        aria-label="Novo lançamento"
        onClick={() => store.editEntry()}
      >
        <RiAddLine className="size-7" />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              tab === t.key ? "text-brand-600" : "text-ink-500"
            }`}
          >
            <t.icon className="size-6" />
            {t.label}
          </button>
        ))}
      </nav>

      {draft && <TransactionSheet draft={draft} onClose={() => setDraft(null)} />}
    </StoreContext.Provider>
  );
}
