import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  FolderKanban,
  Globe,
  Loader2,
  Target,
  TrendingUp,
  Zap,
  Brain,
} from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { LevEmblem } from "@/components/lev/emblem";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  askLev,
  buildLevContext,
  loadLevConfig,
  speakWithLev,
  stopLevVoice,
  type LevConfig,
} from "@/lib/lev-ai";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral — LEV" },
      { name: "description", content: "Sua central de comando pessoal LEV." },
    ],
  }),
  component: DashboardPage,
});

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type News = Database["public"]["Tables"]["daily_news"]["Row"];
type Metrics = Database["public"]["Tables"]["revelare_metrics"]["Row"];
type MindItem = Database["public"]["Tables"]["mind_items"]["Row"];

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function DashboardPage() {
  const [name, setName] = useState("Eduard");
  const [userId, setUserId] = useState<string | null>(null);

  const [verse, setVerse] = useState<{ referencia: string; texto: string } | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [mind, setMind] = useState<MindItem[]>([]);

  const [foco, setFoco] = useState("");
  const [energia, setEnergia] = useState<number | null>(null);

  // Recepção cinematográfica
  const [welcome, setWelcome] = useState(false);
  const [welcomeText, setWelcomeText] = useState<string | null>(null);
  const [welcomeStage, setWelcomeStage] = useState<"preparing" | "ready" | "speaking">("preparing");
  const cfgRef = useRef<LevConfig | null>(null);

  useEffect(() => {
    return () => stopLevVoice();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const uid = data.user.id;
      const hoje = todayISO();

      const [profileQ, verseQ, agendaQ, projectsQ, newsQ, metricsQ, mindQ, stateQ] =
        await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
          supabase.from("daily_verse").select("referencia, texto").eq("data", hoje).maybeSingle(),
          supabase
            .from("agenda_items")
            .select("*")
            .eq("user_id", uid)
            .eq("data", hoje)
            .order("hora", { ascending: true, nullsFirst: false }),
          supabase
            .from("projects")
            .select("*")
            .eq("user_id", uid)
            .eq("status", "ativo")
            .order("prioridade", { ascending: false })
            .limit(5),
          supabase.from("daily_news").select("*").eq("data", hoje).order("created_at").limit(4),
          supabase
            .from("revelare_metrics")
            .select("*")
            .order("data", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("mind_items")
            .select("*")
            .eq("user_id", uid)
            .eq("arquivado", false)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase.from("daily_state").select("*").eq("user_id", uid).eq("data", hoje).maybeSingle(),
        ]);

      if (profileQ.data?.display_name) setName(profileQ.data.display_name);
      if (verseQ.data) setVerse(verseQ.data);
      setAgenda(agendaQ.data ?? []);
      setProjects(projectsQ.data ?? []);
      setNews(newsQ.data ?? []);
      setMetrics(metricsQ.data ?? null);
      setMind(mindQ.data ?? []);
      if (stateQ.data) {
        setFoco(stateQ.data.foco ?? "");
        setEnergia(stateQ.data.energia);
      }

      // Recepção — uma vez por sessão
      if (sessionStorage.getItem("lev_welcomed") === "1") return;
      const cfg = await loadLevConfig();
      if (!cfg?.geminiKey || !cfg?.elevenKey) return;
      cfgRef.current = cfg;
      setWelcome(true);
      setWelcomeStage("preparing");
      try {
        const saud = greetingFor(new Date());
        const context = await buildLevContext();
        const extra = [
          verseQ.data ? `Versículo do dia: ${verseQ.data.referencia} — "${verseQ.data.texto}"` : "",
          agendaQ.data?.length
            ? `Agenda de hoje: ${agendaQ.data.map((a) => `${a.hora?.slice(0, 5) ?? ""} ${a.titulo}`).join("; ")}`
            : "Agenda de hoje vazia.",
          metricsQ.data
            ? `REVELARE: ${metricsQ.data.usuarios_total} usuários, ${metricsQ.data.assinantes_ativos} assinantes ativos, ${metricsQ.data.usuarios_24h} novo(s) nas últimas 24h.`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
        const text = await askLev(
          cfg,
          [
            {
              role: "user",
              text:
                `${cfg.displayName} acabou de entrar no sistema (${saud.toLowerCase()}). Componha sua recepção como um verdadeiro mordomo-conselheiro de elite.` +
                ` Comece exatamente com "${saud}, Senhor ${cfg.displayName}. Um prazer tê-lo aqui." e então compartilhe o dia dele com presença e autoridade serena:` +
                ` o essencial da agenda, o pulso do REVELARE, e onde está a maior alavanca de hoje. Feche com uma frase curta de comando inspirador.` +
                ` Máximo 5 frases além da abertura, texto corrido para voz, sem listas.`,
            },
          ],
          context + "\n" + extra,
        );
        setWelcomeText(text);
        try {
          setWelcomeStage("speaking");
          const audio = await speakWithLev(cfg, text);
          sessionStorage.setItem("lev_welcomed", "1");
          audio.onended = () => setWelcome(false);
        } catch {
          setWelcomeStage("ready");
        }
      } catch {
        setWelcome(false);
      }
    });
  }, []);

  const playWelcome = async () => {
    const cfg = cfgRef.current;
    if (!cfg || !welcomeText) return;
    try {
      setWelcomeStage("speaking");
      const audio = await speakWithLev(cfg, welcomeText);
      sessionStorage.setItem("lev_welcomed", "1");
      audio.onended = () => setWelcome(false);
    } catch {
      setWelcomeStage("ready");
    }
  };

  const saveState = async (patch: { foco?: string; energia?: number }) => {
    if (!userId) return;
    await supabase.from("daily_state").upsert({
      user_id: userId,
      data: todayISO(),
      foco: patch.foco ?? foco ?? null,
      energia: patch.energia ?? energia,
    });
  };

  const now = new Date();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-8 md:py-10">
        {/* Hero */}
        <section className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] text-foreground">
            {greetingFor(now)}, <span className="italic text-gold">Senhor {name}</span>.
          </h1>
          <p className="mt-2 text-muted-foreground">Aqui está o que importa hoje.</p>
        </section>

        {/* Cards do topo */}
        <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <TopCard icon={<Target className="h-4 w-4" />} label="Foco do dia">
            <input
              value={foco}
              onChange={(e) => setFoco(e.target.value)}
              onBlur={() => void saveState({ foco })}
              placeholder="Definir foco…"
              className="w-full bg-transparent font-serif text-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </TopCard>
          <TopCard icon={<CalendarDays className="h-4 w-4" />} label="Compromissos">
            <p className="font-serif text-3xl text-foreground">{agenda.length}</p>
            <p className="text-xs text-muted-foreground">hoje</p>
          </TopCard>
          <TopCard icon={<Zap className="h-4 w-4" />} label="Energia">
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={energia ?? ""}
                onChange={(e) => setEnergia(e.target.value === "" ? null : Number(e.target.value))}
                onBlur={() => energia !== null && void saveState({ energia })}
                placeholder="—"
                className="w-16 bg-transparent font-serif text-3xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
          </TopCard>
          <TopCard icon={<BookOpen className="h-4 w-4" />} label="Versículo do dia" className="col-span-2 lg:col-span-1">
            {verse ? (
              <>
                <p className="font-serif text-lg text-gold">{verse.referencia}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {verse.texto}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sincroniza às 5h com o REVELARE.</p>
            )}
          </TopCard>
        </div>

        {/* Linha central: Agenda + Projetos */}
        <div className="mb-8 grid gap-5 lg:grid-cols-2">
          <Panel title="Agenda do dia" icon={<CalendarDays className="h-4 w-4" />} href="/agenda" linkLabel="Ver agenda completa">
            {agenda.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nada marcado para hoje. Adicione compromissos na Agenda.
              </p>
            ) : (
              <div className="space-y-0">
                {agenda.map((a, i) => (
                  <div key={a.id} className="relative flex gap-4 pb-4">
                    {i < agenda.length - 1 && (
                      <span className="absolute left-[2.55rem] top-6 bottom-0 w-px bg-border/40" />
                    )}
                    <span className="w-12 shrink-0 pt-0.5 text-right text-xs text-muted-foreground">
                      {a.hora ? a.hora.slice(0, 5) : "—"}
                    </span>
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold/70" />
                    <div>
                      <p className={cn("text-sm text-foreground", a.concluido && "line-through opacity-50")}>
                        {a.titulo}
                      </p>
                      {a.detalhe && <p className="text-xs text-muted-foreground">{a.detalhe}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Resumo dos projetos" icon={<FolderKanban className="h-4 w-4" />} href="/projetos" linkLabel="Ver todos os projetos">
            {projects.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Crie seus projetos — Revelare, Up Home Services, Investir Orlando…
              </p>
            ) : (
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-serif text-sm text-gold">
                      {p.nome.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{p.nome}</p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/40">
                        <div className="h-full bg-gradient-gold" style={{ width: `${p.progresso}%` }} />
                      </div>
                    </div>
                    <span className="text-sm text-gold">{p.progresso}%</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Linha de baixo: REVELARE + Notícias + Mind */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="REVELARE ao vivo" icon={<TrendingUp className="h-4 w-4" />}>
            {metrics ? (
              <div className="grid grid-cols-2 gap-4">
                <Metric label="Usuários" value={metrics.usuarios_total} />
                <Metric label="Assinantes" value={metrics.assinantes_ativos} gold />
                <Metric label="Novos 24h" value={metrics.usuarios_24h} />
                <Metric label="Assin. 7 dias" value={metrics.novas_assinaturas_7d} />
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">Métricas sincronizam às 5h15.</p>
            )}
          </Panel>

          <Panel title="Mundo & você" icon={<Globe className="h-4 w-4" />}>
            {news.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                LEV seleciona notícias relevantes todo dia às 5h15.
              </p>
            ) : (
              <div className="space-y-3">
                {news.map((n) => (
                  <a
                    key={n.id}
                    href={n.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block group"
                  >
                    <p className="text-sm text-foreground transition group-hover:text-gold">
                      {n.titulo}
                    </p>
                    {n.resumo && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.resumo}</p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Lev Mind" icon={<Brain className="h-4 w-4" />} href="/mind" linkLabel="Acessar Lev Mind">
            {mind.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Capture ideias a qualquer momento — LEV organiza tudo.
              </p>
            ) : (
              <div className="space-y-3">
                {mind.map((m) => (
                  <div key={m.id}>
                    <p className="line-clamp-2 text-sm text-foreground">{m.conteudo}</p>
                    {m.categoria && (
                      <span className="text-[10px] uppercase tracking-widest text-gold/70">
                        {m.categoria}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* RECEPÇÃO CINEMATOGRÁFICA */}
      {welcome && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
          <div className="absolute inset-0 bg-gradient-radial-gold opacity-60" />
          <div
            className={cn(
              "relative transition-transform duration-1000",
              welcomeStage === "speaking" ? "scale-110" : "scale-100",
            )}
          >
            <LevEmblem size={220} active />
          </div>
          <p className="relative mt-12 text-xs uppercase tracking-[0.5em] text-gold/80">
            {welcomeStage === "preparing" && "LEV está chegando…"}
            {welcomeStage === "ready" && "LEV aguarda"}
            {welcomeStage === "speaking" && "LEV"}
          </p>
          {welcomeStage === "preparing" && (
            <Loader2 className="relative mt-6 h-5 w-5 animate-spin text-gold/70" />
          )}
          {welcomeStage === "ready" && (
            <button
              onClick={() => void playWelcome()}
              className="relative mt-8 rounded-full bg-gold px-8 py-3.5 font-serif text-lg text-gold-foreground shadow-gold transition hover:opacity-90 animate-pulse"
            >
              Receber LEV
            </button>
          )}
          {welcomeStage === "speaking" && welcomeText && (
            <p className="relative mx-auto mt-8 max-w-2xl px-8 text-center text-base leading-relaxed text-foreground/90 animate-fade-up">
              {welcomeText}
            </p>
          )}
          <button
            onClick={() => {
              stopLevVoice();
              sessionStorage.setItem("lev_welcomed", "1");
              setWelcome(false);
            }}
            className="absolute bottom-8 text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground"
          >
            Pular
          </button>
        </div>
      )}
    </AppShell>
  );
}

function TopCard({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl p-5", className)}>
      <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gold/80">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  href,
  linkLabel,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="glass flex flex-col rounded-2xl p-6">
      <p className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gold/80">
        {icon} {title}
      </p>
      <div className="flex-1">{children}</div>
      {href && linkLabel && (
        <Link
          to={href}
          className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground transition hover:text-gold"
        >
          {linkLabel} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Metric({ label, value, gold }: { label: string; value: number | null; gold?: boolean }) {
  return (
    <div>
      <p className={cn("font-serif text-2xl", gold ? "text-gold" : "text-foreground")}>
        {value ?? "—"}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
