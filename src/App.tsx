import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { StoreProvider, useStore } from "./store";
import { NavContext, TABS, type Draft, type Tab } from "./navigation";
import { BottomNav, ErrorNote, SideNav } from "./components";
import Home from "./screens/home/Home";
import Entries from "./screens/entries/Entries";
import PhotoImport from "./screens/entries/PhotoImport";
import TransactionSheet from "./screens/entries/TransactionSheet";
import Work from "./screens/work/Work";
import People from "./screens/people/People";
import Settings from "./screens/settings/Settings";

const SCREENS: Record<Tab, () => React.JSX.Element> = {
  home: Home,
  entries: Entries,
  work: Work,
  people: People,
  settings: Settings,
};

export default function App({ user }: { user: User }) {
  return (
    <StoreProvider user={user}>
      <Shell />
    </StoreProvider>
  );
}

function initialTab(): Tab {
  const h = location.hash.slice(1) as Tab;
  return TABS.some((t) => t.key === h) ? h : "home";
}

/** Menu, tela aberta e formulário de lançamento. */
function Shell() {
  const { error } = useStore();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [photo, setPhoto] = useState(false);

  useEffect(() => {
    history.replaceState(null, "", tab === "home" ? location.pathname : `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab]);

  const nav = useMemo(
    () => ({ tab, go: setTab, editEntry: (d?: Draft) => setDraft(d ?? {}), importPhoto: () => setPhoto(true) }),
    [tab],
  );
  const Screen = SCREENS[tab];

  return (
    <NavContext.Provider value={nav}>
      <div className="min-h-dvh md:flex">
        <SideNav />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12">
          {error && (
            <div className="mb-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          <Screen />
        </main>
      </div>
      <BottomNav />
      {draft && <TransactionSheet draft={draft} onClose={() => setDraft(null)} />}
      {photo && <PhotoImport onClose={() => setPhoto(false)} />}
    </NavContext.Provider>
  );
}
