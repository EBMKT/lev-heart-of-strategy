import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  MessageCircle,
  FolderKanban,
  FileText,
  Sparkles,
  Settings,
  LogOut,
  Wallet,
  Brain,
  CalendarDays,
  BookOpen,
  Search,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LevEmblem, LevWordmark } from "./emblem";

const NAV = [
  { to: "/", label: "Visão Geral", sub: "Seu dia em um olhar", icon: Home },
  { to: "/chat", label: "Lev AI", sub: "Conversa & voz", icon: MessageCircle },
  { to: "/projetos", label: "Projetos", sub: "Negócios & metas", icon: FolderKanban },
  { to: "/financas", label: "Finanças", sub: "Entradas & saídas", icon: Wallet },
  { to: "/mind", label: "Lev Mind", sub: "Ideias & memória", icon: Brain },
  { to: "/agenda", label: "Agenda", sub: "Compromissos", icon: CalendarDays },
  { to: "/ministracoes", label: "Ministrações", sub: "Palavra & pregações", icon: BookOpen },
  { to: "/redes", label: "Redes", sub: "Conteúdo social", icon: Sparkles },
  { to: "/briefings", label: "Briefings", sub: "Manhã · tarde · noite", icon: FileText },
] as const;

const MOBILE_NAV = ["/", "/chat", "/projetos", "/financas", "/agenda"] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [query, setQuery] = useState("");
  const { location } = useRouterState();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate({ to: "/auth" });
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecked(true);
      if (!data.user) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LevEmblem active size={72} />
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const askLevSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    sessionStorage.setItem("lev_ask", q);
    setQuery("");
    navigate({ to: "/chat" });
  };

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border/50 px-5 py-7 overflow-y-auto">
        <Link to="/" className="flex items-center gap-3 mb-2 px-1">
          <LevEmblem size={40} active={false} />
          <div>
            <LevWordmark />
            <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground mt-0.5">
              Sistema operacional pessoal
            </p>
          </div>
        </Link>
        <div className="my-5 h-px bg-border/40" />
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                  active
                    ? "bg-accent text-gold border border-gold/20"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">
                  <span className={cn("block text-sm tracking-wide", active && "text-gold")}>
                    {item.label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground/80">{item.sub}</span>
                </span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
              </Link>
            );
          })}
        </nav>
        <div className="my-4 h-px bg-border/40" />
        <Link
          to="/configuracoes"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            isActive("/configuracoes")
              ? "bg-accent text-gold"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4" /> Configurações
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent/50 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
        <div className="mt-6 rounded-xl border border-gold/20 bg-gradient-radial-gold p-4">
          <p className="font-serif text-lg text-gold">LEV</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Seu conselheiro executivo
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80 italic">Sempre ao seu lado.</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 pb-24 md:pb-8 overflow-x-hidden">
        {/* Top bar (desktop) */}
        <header className="hidden md:flex items-center gap-6 border-b border-border/40 px-8 py-4">
          <form onSubmit={askLevSearch} className="flex flex-1 max-w-xl items-center gap-3 rounded-xl border border-border/60 bg-accent/30 px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pergunte ao Lev…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </form>
          <div className="ml-auto text-right">
            <p className="text-sm text-foreground">
              {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long" })}
            </p>
          </div>
        </header>

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2">
            <LevEmblem size={32} />
            <LevWordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/configuracoes" aria-label="Configurações" className="text-muted-foreground">
              <Settings className="h-5 w-5" />
            </Link>
            <button onClick={handleSignOut} aria-label="Sair" className="text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="animate-fade-up">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => (MOBILE_NAV as readonly string[]).includes(n.to)).map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-[10px] tracking-wide transition",
                  active ? "text-gold" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label === "Visão Geral" ? "Início" : item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
