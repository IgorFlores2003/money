import { useState, type FormEvent } from "react";
import { RiAddLine, RiLogoutBoxRLine } from "react-icons/ri";
import { useStore } from "../App";
import { del, post, put } from "../api";
import { supabase } from "../supabase";
import { colorMode, setColorMode, type ColorMode } from "../theme";
import { brl, hourValueCents, type Account, type Category, type Kind } from "../../shared/finance";
import { ColorPicker, confirmDelete, Dot, ErrorNote, MoneyField, Segmented, Sheet } from "../ui";

export default function Settings() {
  const store = useStore();
  const { profile, categories, accounts } = store;
  const [cat, setCat] = useState<Partial<Category> | null>(null);
  const [acc, setAcc] = useState<Partial<Account> | null>(null);
  const [mode, setMode] = useState<ColorMode>(colorMode());

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      <ProfileForm />

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Categorias</h2>
        </div>
        <p className="mt-1 text-sm text-ink-500">Crie quantos tipos de despesa e receita quiser.</p>
        {(["expense", "income"] as Kind[]).map((kind) => (
          <div key={kind} className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink-500">{kind === "expense" ? "Despesas" : "Receitas"}</h3>
              <button className="btn-ghost px-2 py-1 text-sm" onClick={() => setCat({ kind, color: "#2563eb" })}>
                <RiAddLine className="size-4" /> Nova
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.kind === kind)
                .map((c) => (
                  <button key={c.id} className={`chip ${c.archived ? "opacity-50" : ""}`} onClick={() => setCat(c)}>
                    <Dot color={c.color} /> {c.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Contas e cartões</h2>
          <button className="btn-ghost px-2 py-1 text-sm" onClick={() => setAcc({ type: "credit", color: "#7c3aed" })}>
            <RiAddLine className="size-4" /> Nova
          </button>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {accounts.map((a) => (
            <li key={a.id}>
              <button className={`flex w-full items-center gap-3 py-3 text-left ${a.archived ? "opacity-50" : ""}`} onClick={() => setAcc(a)}>
                <Dot color={a.color} />
                <span className="flex-1 font-medium">{a.name}</span>
                <span className="text-sm text-ink-500">
                  {a.type === "credit"
                    ? a.closing_day
                      ? `Cartão · fecha dia ${a.closing_day}`
                      : "Cartão · sem fechamento"
                    : a.type === "cash"
                      ? "Dinheiro"
                      : "Débito / Pix"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Aparência</h2>
        <Segmented
          label="Tema"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setColorMode(m);
          }}
          options={[
            { value: "system", label: "Sistema" },
            { value: "light", label: "Claro" },
            { value: "dark", label: "Escuro" },
          ]}
        />
      </section>

      <section className="card flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-500">Conectado como</p>
          <p className="truncate font-medium">{profile.email}</p>
        </div>
        <button className="btn-secondary" onClick={() => supabase?.auth.signOut({ scope: "local" })}>
          <RiLogoutBoxRLine className="size-5" /> Sair
        </button>
      </section>

      {cat && <CategorySheet item={cat} onClose={() => setCat(null)} />}
      {acc && <AccountSheet item={acc} onClose={() => setAcc(null)} />}
      <p className="text-center text-xs text-ink-400">
        Sua hora vale {brl(hourValueCents(profile))}
      </p>
    </div>
  );
}

function ProfileForm() {
  const store = useStore();
  const p = store.profile;
  const [name, setName] = useState(p.name);
  const [rate, setRate] = useState(p.hourly_rate_cents);
  const [salary, setSalary] = useState(p.salary_cents);
  const [goal, setGoal] = useState(String(p.hours_goal));
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; error?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    try {
      const saved = await put<typeof p>("me", {
        name,
        hourly_rate_cents: rate,
        salary_cents: salary,
        hours_goal: Math.max(0, Math.min(744, Math.round(Number(goal) || 0))),
      });
      store.setProfile(saved);
      setState({ ok: true });
    } catch (err) {
      setState({ error: (err as Error).message });
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4">
      <h2 className="font-semibold">Perfil e renda</h2>
      <label className="block">
        <span className="label">Nome</span>
        <input className="field" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyField label="Quanto ganho por hora" value={rate} onChange={setRate} hint="Multiplica as horas lançadas." />
        <MoneyField label="Salário fixo mensal" value={salary} onChange={setSalary} hint="Entra todo mês na receita." />
        <label className="block">
          <span className="label">Meta de horas no mês</span>
          <input className="field" type="number" min={0} max={744} inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <span className="mt-1 block text-sm text-ink-500">
            {rate > 0 && Number(goal) > 0 ? `Potencial: ${brl(rate * Number(goal))}` : "Ex.: 80 ou 168"}
          </span>
        </label>
      </div>
      <p className="text-sm text-ink-500">
        Pode usar só um dos dois ou os dois juntos (salário + horas extras). Sem valor da hora, ela é calculada pelo salário ÷ meta.
      </p>
      <ErrorNote>{state.error}</ErrorNote>
      <button className="btn-primary self-start" disabled={state.busy}>
        {state.busy ? "Salvando…" : state.ok ? "Salvo ✓" : "Salvar"}
      </button>
    </form>
  );
}

function CategorySheet({ item, onClose }: { item: Partial<Category>; onClose: () => void }) {
  const store = useStore();
  const [name, setName] = useState(item.name ?? "");
  const [color, setColor] = useState(item.color ?? "#2563eb");
  const [archived, setArchived] = useState(item.archived ?? false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (item.id) await put(`categories/${item.id}`, { name, color, archived });
      else await post("categories", { kind: item.kind, name, color });
      await store.reloadMeta();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove() {
    if (!(await confirmDelete(`Excluir “${item.name}”?`, "Os lançamentos dela ficam como “Sem categoria”. Para só esconder, use Arquivar."))) return;
    await del(`categories/${item.id}`);
    await Promise.all([store.reloadMeta(), store.reload()]);
    onClose();
  }

  return (
    <Sheet title={item.id ? "Editar categoria" : item.kind === "income" ? "Nova categoria de receita" : "Nova categoria de despesa"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="block">
          <span className="label">Nome</span>
          <input className="field" required maxLength={40} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <ColorPicker value={color} onChange={setColor} />
        {item.id && (
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            Arquivar (some das opções, mas mantém o histórico)
          </label>
        )}
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary">Salvar</button>
        {item.id && (
          <button type="button" className="btn-ghost text-neg" onClick={remove}>
            Excluir
          </button>
        )}
      </form>
    </Sheet>
  );
}

function AccountSheet({ item, onClose }: { item: Partial<Account>; onClose: () => void }) {
  const store = useStore();
  const [name, setName] = useState(item.name ?? "");
  const [type, setType] = useState<Account["type"]>(item.type ?? "debit");
  const [closing, setClosing] = useState(item.closing_day ? String(item.closing_day) : "");
  const [color, setColor] = useState(item.color ?? "#7c3aed");
  const [archived, setArchived] = useState(item.archived ?? false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = { name, type, color, archived, closing_day: closing ? Number(closing) : null };
    try {
      if (item.id) await put(`accounts/${item.id}`, body);
      else await post("accounts", body);
      await store.reloadMeta();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove() {
    if (!(await confirmDelete(`Excluir “${item.name}”?`, "Os lançamentos ficam “Sem conta”."))) return;
    await del(`accounts/${item.id}`);
    await Promise.all([store.reloadMeta(), store.reload()]);
    onClose();
  }

  return (
    <Sheet title={item.id ? "Editar conta" : "Nova conta ou cartão"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="block">
          <span className="label">Nome</span>
          <input className="field" required maxLength={40} autoFocus placeholder="Ex.: Nubank" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <Segmented
          label="Tipo"
          value={type}
          onChange={setType}
          options={[
            { value: "credit", label: "Cartão de crédito" },
            { value: "debit", label: "Débito / Pix" },
            { value: "cash", label: "Dinheiro" },
          ]}
        />
        {type === "credit" && (
          <label className="block">
            <span className="label">Dia de fechamento da fatura</span>
            <input className="field" type="number" min={1} max={31} inputMode="numeric" value={closing} onChange={(e) => setClosing(e.target.value)} />
            <span className="mt-1 block text-sm text-ink-500">
              Compras a partir desse dia entram na fatura do mês seguinte.
            </span>
          </label>
        )}
        <ColorPicker value={color} onChange={setColor} />
        {item.id && (
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            Arquivar
          </label>
        )}
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary">Salvar</button>
        {item.id && (
          <button type="button" className="btn-ghost text-neg" onClick={remove}>
            Excluir
          </button>
        )}
      </form>
    </Sheet>
  );
}
