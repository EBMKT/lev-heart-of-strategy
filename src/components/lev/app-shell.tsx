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
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LevEmblem, LevWordmark } from "./emblem";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/briefings", label: "Briefings", icon: FileText },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/redes", label: "Redes", icon: Sparkles },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border/50 px-6 py-8">
        <Link to="/" className="flex items-center gap-3 mb-12">
          <LevEmblem size={44} active={false} />
          <LevWordmark />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-accent text-gold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="tracking-wide">{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
                )}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleSignOut}
          className="mt-6 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent/50 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-8 overflow-x-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2">
            <LevEmblem size={32} />
            <LevWordmark className="text-lg" />
          </Link>
          <button
            onClick={handleSignOut}
            aria-label="Sair"
            className="text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <div className="animate-fade-up">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => n.to !== "/configuracoes").map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
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
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
