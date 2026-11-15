import { useState } from "react";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { brl, hourValueCents } from "../../../shared/finance";
import { PageHeader, Segmented } from "../../components";
import { useStore } from "../../store";
import { supabase } from "../../supabase";
import { colorMode, setColorMode, type ColorMode } from "../../theme";
import AccountsSection from "./AccountsSection";
import CategoriesSection from "./CategoriesSection";
import PrivacySection from "./PrivacySection";
import ProfileForm from "./ProfileForm";

export default function Settings() {
  const { profile } = useStore();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ajustes" />
      <ProfileForm />
      <CategoriesSection />
      <AccountsSection />
      <AppearanceSection />
      <section className="card flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-500">Conectado como</p>
          <p className="truncate font-medium">{profile.email}</p>
        </div>
        <button className="btn-secondary" onClick={() => supabase?.auth.signOut({ scope: "local" })}>
          <RiLogoutBoxRLine className="size-5" /> Sair
        </button>
      </section>
      <PrivacySection />
      <p className="text-center text-xs text-ink-400">Sua hora vale {brl(hourValueCents(profile))}</p>
    </div>
  );
}

function AppearanceSection() {
  const [mode, setMode] = useState<ColorMode>(colorMode());
  return (
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
  );
}
