import { RiAddLine, RiMoneyDollarCircleLine } from "react-icons/ri";
import { TABS, useNav } from "../navigation";

/** Menu lateral no computador. */
export function SideNav() {
  const { tab, go, editEntry } = useNav();
  return (
    <nav className="hidden w-60 shrink-0 flex-col gap-1 border-r border-line bg-card p-4 md:flex md:sticky md:top-0 md:h-dvh">
      <div className="mb-6 flex items-center gap-2 px-2 text-xl font-bold">
        <RiMoneyDollarCircleLine className="size-7 text-brand-600" /> Meu DimDim
      </div>
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => go(t.key)}
          aria-current={tab === t.key ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium ${
            tab === t.key ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-page"
          }`}
        >
          <t.icon className="size-5" /> {t.label}
        </button>
      ))}
      <button className="btn-primary mt-4" onClick={() => editEntry()}>
        <RiAddLine className="size-5" /> Novo lançamento
      </button>
    </nav>
  );
}

/** Barra inferior + botão flutuante de lançar, no celular. */
export function BottomNav() {
  const { tab, go, editEntry } = useNav();
  return (
    <>
      <button
        className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg md:hidden"
        aria-label="Novo lançamento"
        onClick={() => editEntry()}
      >
        <RiAddLine className="size-7" />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => go(t.key)}
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
    </>
  );
}
