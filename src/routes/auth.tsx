import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { LevEmblem, LevWordmark } from "@/components/lev/emblem";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — LEV" },
      { name: "description", content: "Acesso à central de comando LEV." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Eduard");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Bem-vindo.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Toaster theme="dark" position="top-center" />
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-md animate-fade-up">
          <div className="flex flex-col items-center gap-4 mb-10">
            <LevEmblem size={96} active />
            <LevWordmark className="text-3xl" />
            <p className="text-sm text-muted-foreground tracking-wide">
              Coração. Leão. Estratégia.
            </p>
          </div>

          <div className="glass rounded-2xl p-8">
            <h1 className="font-serif text-3xl text-foreground mb-1">
              {mode === "signin" ? "Bem-vindo de volta" : "Criar conta"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signin"
                ? "Entre para acessar sua central de comando."
                : "Configure sua central pessoal LEV."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "signup" && (
                <Field
                  label="Nome"
                  value={name}
                  onChange={setName}
                  type="text"
                  required
                />
              )}
              <Field
                label="E-mail"
                value={email}
                onChange={setEmail}
                type="email"
                required
                autoComplete="email"
              />
              <Field
                label="Senha"
                value={password}
                onChange={setPassword}
                type="password"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-md bg-gold py-3 text-sm font-medium tracking-wide transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
              </button>
            </form>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-gold transition"
            >
              {mode === "signin"
                ? "Ainda não tem conta? Criar uma"
                : "Já tem conta? Entrar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-input/40 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
      />
    </label>
  );
}
