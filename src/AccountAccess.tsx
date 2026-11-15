import { useEffect, useRef, useState, type FormEvent } from "react";
import { RiArrowLeftLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { supabase } from "./supabase";
import { authError, passwordError } from "./auth";
import { ErrorNote } from "./components";

type Mode = "login" | "signup" | "confirm" | "forgot" | "recover" | "password";

const TITLES: Record<Mode, [string, string]> = {
  login: ["Entrar", "Acesse sua conta para ver suas finanças."],
  signup: ["Criar conta", "Cada perfil tem suas próprias contas, horas e lançamentos."],
  confirm: ["Confirme seu e-mail", "Digite o código que enviamos para você."],
  forgot: ["Recuperar senha", "Enviaremos um código para o seu e-mail."],
  recover: ["Informe o código", "Digite o código de recuperação que enviamos."],
  password: ["Nova senha", "Escolha uma senha com pelo menos 8 caracteres."],
};

export default function AccountAccess({
  recovery,
  onRecovered,
  initialEmail = "",
}: {
  recovery: boolean;
  onRecovered: () => void;
  initialEmail?: string;
}) {
  const [mode, setMode] = useState<Mode>(recovery ? "password" : initialEmail ? "confirm" : "login");
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (recovery) setMode("password");
  }, [recovery]);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function change(next: Mode) {
    if (inFlight.current) return;
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmation("");
    setToken("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || inFlight.current) return;
    setError("");
    setMessage("");
    if (mode === "signup" || mode === "password") {
      const problem = passwordError(password, confirmation);
      if (problem) return setError(problem);
    }
    inFlight.current = true;
    setBusy(true);
    const address = email.trim();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error?.code === "email_not_confirmed") {
          await supabase.auth.resend({ type: "signup", email: address });
          setCooldown(60);
          setMode("confirm");
          setMessage("Seu e-mail ainda não foi confirmado. Enviamos um novo código.");
          return;
        }
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        setCooldown(60);
        if (!data.session) {
          setMode("confirm");
          setMessage("Se o cadastro puder ser concluído, o código chega em instantes. Confira também o spam.");
        }
      } else if (mode === "confirm" || mode === "recover") {
        const { error } = await supabase.auth.verifyOtp({
          email: address,
          token: token.trim(),
          type: mode === "confirm" ? "email" : "recovery",
        });
        if (error) throw error;
        if (mode === "recover") {
          setMode("password");
          setMessage("Código confirmado. Escolha sua nova senha.");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(address);
        if (error) throw error;
        setCooldown(60);
        setMode("recover");
        setMessage("Se houver uma conta para esse e-mail, o código chega em instantes.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        onRecovered();
      }
      setPassword("");
      setConfirmation("");
      setToken("");
    } catch (err) {
      setError(authError(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function resend() {
    if (!supabase || cooldown || !email.trim()) return;
    const { error } =
      mode === "recover"
        ? await supabase.auth.resetPasswordForEmail(email.trim())
        : await supabase.auth.resend({ type: "signup", email: email.trim() });
    if (error) return setError(authError(error));
    setCooldown(60);
    setMessage("Se houver uma confirmação pendente, um novo código foi enviado.");
  }

  const [title, subtitle] = TITLES[mode];
  const pw = (value: string, set: (v: string) => void, label: string, auto: string) => (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          className="field pr-11"
          type={visible ? "text" : "password"}
          autoComplete={auto}
          required
          minLength={mode === "login" ? undefined : 8}
          value={value}
          onChange={(e) => set(e.target.value)}
        />
        <button
          type="button"
          className="icon-btn absolute top-0.5 right-0.5"
          aria-label={visible ? "Esconder senha" : "Mostrar senha"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <RiEyeOffLine className="size-5" /> : <RiEyeLine className="size-5" />}
        </button>
      </div>
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode !== "login" && mode !== "password" && (
        <button type="button" className="btn-ghost -ml-3 self-start px-3" onClick={() => change("login")}>
          <RiArrowLeftLine className="size-5" /> Voltar
        </button>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-[15px] text-ink-500">{subtitle}</p>
      </div>
      {message && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">{message}</p>}
      <ErrorNote>{error}</ErrorNote>
      {mode === "signup" && (
        <label className="block">
          <span className="label">Nome</span>
          <input className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      {mode !== "password" && (
        <label className="block">
          <span className="label">E-mail</span>
          <input
            className="field"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      {(mode === "login" || mode === "signup" || mode === "password") &&
        pw(password, setPassword, mode === "password" ? "Nova senha" : "Senha", mode === "login" ? "current-password" : "new-password")}
      {(mode === "signup" || mode === "password") &&
        pw(confirmation, setConfirmation, "Repita a senha", "new-password")}
      {(mode === "confirm" || mode === "recover") && (
        <label className="block">
          <span className="label">Código</span>
          <input
            className="field tracking-[0.3em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </label>
      )}
      <button className="btn-primary mt-1" disabled={busy}>
        {busy ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar código" : mode === "password" ? "Salvar senha" : "Confirmar"}
      </button>
      {(mode === "confirm" || mode === "recover") && (
        <button type="button" className="btn-ghost" disabled={Boolean(cooldown)} onClick={resend}>
          {cooldown ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
        </button>
      )}
      {mode === "login" && (
        <div className="flex flex-col gap-1">
          <button type="button" className="btn-secondary" onClick={() => change("signup")}>
            Criar conta
          </button>
          <button type="button" className="btn-ghost" onClick={() => change("forgot")}>
            Esqueci minha senha
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={() => change("confirm")}>
            Tenho um código de confirmação
          </button>
        </div>
      )}
    </form>
  );
}
