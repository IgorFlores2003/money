import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
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
import { ErrorNote, Spinner } from "./components/display";

/** Dados da conta e do mês aberto, compartilhados por todas as telas. */
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
  /** Erro da última carga do mês. */
  error: string;
  /** Recarrega o mês aberto. */
  reload: () => Promise<void>;
  /** Recarrega perfil, categorias e contas. */
  reloadMeta: () => Promise<void>;
}

type MonthData = { month: string; transactions: Transaction[]; recurrences: Recurrence[]; work: WorkEntry[] };

const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore precisa estar dentro de <StoreProvider>.");
  return store;
}

/** Carrega perfil, categorias, contas e o mês; só renderiza os filhos quando o perfil chega. */
export function StoreProvider({ user, children }: { user: User; children: ReactNode }) {
  const [profile, setProfile] = useState<Store["profile"] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState("");
  const [loadingMonth, setLoadingMonth] = useState(true);

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
      const d = await api<MonthData>(`month?m=${month}`);
      setData((prev) => (d.month === month ? d : prev));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMonth(false);
    }
  }, [month]);

  const updateProfile = useCallback((p: Profile) => setProfile((old) => ({ ...old!, ...p })), []);

  useEffect(() => {
    reloadMeta().catch((e) => setError((e as Error).message));
  }, [reloadMeta]);
  const hasProfile = Boolean(profile);
  useEffect(() => {
    if (hasProfile) void reload();
  }, [reload, hasProfile]);

  const store = useMemo<Store | null>(() => {
    if (!profile) return null;
    const current = data?.month === month ? data : null;
    const transactions = current?.transactions ?? [];
    const recurrences = current?.recurrences ?? [];
    const work = current?.work ?? [];
    const entries = monthEntries(month, transactions, recurrences);
    return {
      user,
      profile,
      setProfile: updateProfile,
      categories,
      accounts,
      month,
      setMonth,
      transactions,
      recurrences,
      work,
      entries,
      summary: summarize(profile, entries, work, categories, accounts),
      loadingMonth: loadingMonth || !current,
      error,
      reload,
      reloadMeta,
    };
  }, [user, profile, updateProfile, categories, accounts, month, data, loadingMonth, error, reload, reloadMeta]);

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

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
