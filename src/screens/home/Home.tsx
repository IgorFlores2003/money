import { PageHeader, Spinner } from "../../components";
import { useNav } from "../../navigation";
import { useStore } from "../../store";
import BalanceCard from "./BalanceCard";
import HistoryChart from "./HistoryChart";
import { AccountsCard, CategoriesCard, HoursCard, PeopleCard } from "./SummaryCards";

export default function Home() {
  const { profile, loadingMonth } = useStore();
  const { go } = useNav();
  const first = profile.name.split(" ")[0];
  const noIncomeSetup = !profile.salary_cents && !profile.hourly_rate_cents;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={first ? `Olá, ${first}` : "Resumo"} withMonth />

      {noIncomeSetup && (
        <p className="rounded-xl bg-warn-50 p-3 text-sm text-warn-800">
          Informe seu salário ou quanto ganha por hora em{" "}
          <button className="font-semibold underline" onClick={() => go("settings")}>
            Ajustes
          </button>{" "}
          para calcular sua receita.
        </p>
      )}

      {loadingMonth ? (
        <Spinner />
      ) : (
        <>
          <BalanceCard />
          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <HoursCard />
            <CategoriesCard />
            <AccountsCard />
            <PeopleCard />
          </div>
          <HistoryChart />
        </>
      )}
    </div>
  );
}
