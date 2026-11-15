import { createContext, useContext } from "react";
import {
  RiExchangeDollarLine,
  RiHome5Line,
  RiSettings3Line,
  RiTeamLine,
  RiTimerLine,
} from "react-icons/ri";
import type { Entry } from "../shared/finance";

export type Tab = "home" | "entries" | "work" | "people" | "settings";

export const TABS: { key: Tab; label: string; icon: typeof RiHome5Line }[] = [
  { key: "home", label: "Início", icon: RiHome5Line },
  { key: "entries", label: "Lançamentos", icon: RiExchangeDollarLine },
  { key: "work", label: "Horas", icon: RiTimerLine },
  { key: "people", label: "Pessoas", icon: RiTeamLine },
  { key: "settings", label: "Ajustes", icon: RiSettings3Line },
];

/** Rascunho do formulário de lançamento: vazio para novo, um Entry para editar. */
export type Draft = Partial<Entry>;

interface Nav {
  tab: Tab;
  go: (tab: Tab) => void;
  /** Abre o formulário de lançamento. */
  editEntry: (draft?: Draft) => void;
  /** Abre o lançamento por foto. */
  importPhoto: () => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav() {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav precisa estar dentro de <NavContext.Provider>.");
  return nav;
}
