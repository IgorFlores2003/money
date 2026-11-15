import { useStore } from "../store";
import { MonthPicker } from "./fields";

/** Título da tela; com `withMonth`, mostra o seletor do mês aberto ao lado. */
export function PageHeader({ title, withMonth }: { title: string; withMonth?: boolean }) {
  if (!withMonth) return <h1 className="text-2xl font-bold tracking-tight">{title}</h1>;
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <MonthSelector />
    </header>
  );
}

function MonthSelector() {
  const { month, setMonth } = useStore();
  return <MonthPicker month={month} onChange={setMonth} />;
}
