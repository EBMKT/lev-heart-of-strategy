import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  FolderKanban,
  MessageCircle,
  Sparkles,
  ArrowUpRight,
  Volume2,
  Loader2,
} from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { LevEmblem } from "@/components/lev/emblem";
import { supabase } from "@/integrations/supabase/client";
import {
  askLev,
  buildLevContext,
  loadLevConfig,
  speakWithLev,
  stopLevVoice,
  type LevConfig,
} from "@/lib/lev-ai";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LEV" },
      { name: "description", content: "Sua central de comando pessoal LEV." },
    ],
  }),
  component: DashboardPage,
});

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 5) return { periodo: "madrugada", saudacao: "Boa madrugada" };
  if (h < 12) return { periodo: "manhã", saudacao: "Bom dia" };
  if (h < 18) return { periodo: "tarde", saudacao: "Boa tarde" };
  return { periodo: "noite", saudacao: "Boa noite" };
}

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

type WelcomeState = "idle" | "preparing" | "ready" | "speaking" | "done";

function DashboardPage() {
  const [name, setName] = useState("Eduard");
  const [now, setNow] = useState(() => new Date());
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);

  // Recepção falada de LEV
  const [welcomeState, setWelcomeState] = useState<WelcomeState>("idle");
  const [welcomeText, setWelcomeText] = useState<string | null>(null);
  const cfgRef = useRef<LevConfig | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      clearInterval(t);
      stopLevVoice();
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.display_name) setName(profile.display_name);

      const [{ count: pc }, { count: postC }] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", data.user.id),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", data.user.id),
      ]);
      setProjectCount(pc ?? 0);
      setPostCount(postC ?? 0);

      // Prepara a recepção falada (uma vez por sessão)
      if (sessionStorage.getItem("lev_welcomed") === "1") return;
      const cfg = await loadLevConfig();
      if (!cfg?.geminiKey || !cfg?.elevenKey) return;
      cfgRef.current = cfg;
      setWelcomeState("preparing");
      try {
        const { saudacao } = greetingFor(new Date());
        const context = await buildLevContext();
        const text = await askLev(
          cfg,
          [
            {
              role: "user",
              text:
                `Monte sua fala de recepção: ${cfg.displayName} acabou de entrar no sistema agora (${saudacao.toLowerCase()}).` +
                ` Comece exatamente com "${saudacao}, Senhor ${cfg.displayName}. Um prazer tê-lo aqui." e então compartilhe sobre o dia dele:` +
                ` o que merece atenção nos projetos, conteúdo na fila e um foco sugerido.` +
                ` No máximo 4 frases além da abertura, em texto corrido para ser falado em voz alta, sem listas nem emojis.`,
            },
          ],
          context,
        );
        setWelcomeText(text);
        // Tenta falar automaticamente; se o navegador bloquear, mostra o botão
        try {
          setWelcomeState("speaking");
          const audio = await speakWithLev(cfg, text);
          sessionStorage.setItem("lev_welcomed", "1");
          audio.onended = () => setWelcomeState("done");
        } catch {
          setWelcomeState("ready");
        }
      } catch {
        setWelcomeState("idle");
      }
    });
  }, []);

  const playWelcome = async () => {
    const cfg = cfgRef.current;
    if (!cfg || !welcomeText) return;
    try {
      setWelcomeState("speaking");
      const audio = await speakWithLev(cfg, welcomeText);
      sessionStorage.setItem("lev_welcomed", "1");
      audio.onended = () => setWelcomeState("done");
    } catch {
      setWelcomeState("ready");
    }
  };

  const { saudacao } = greetingFor(now);
  const dataFmt = `${DIAS[now.getDay()]}, ${now.getDate()} de ${MESES[now.getMonth()]}`;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 md:px-10 py-10 md:py-16">
        {/* Hero */}
        <section className="flex flex-col md:flex-row md:items-center gap-8 md:gap-14 mb-14">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/80 mb-3">
              {dataFmt}
            </p>
            <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] text-foreground">
              {saudacao},{" "}
              <span className="italic text-gold">Senhor {name}</span>.
            </h1>

            {welcomeText ? (
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                {welcomeText}
              </p>
            ) : (
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl">
                {welcomeState === "preparing"
                  ? "LEV está preparando sua recepção…"
                  : "LEV está atento. Aqui está sua central para hoje — projetos, briefings, conteúdo e conversa direta."}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {welcomeState === "ready" && (
                <button
                  onClick={() => void playWelcome()}
                  className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium tracking-wide shadow-gold transition hover:opacity-90 animate-pulse"
                >
                  <Volume2 className="h-4 w-4" />
                  Receber LEV
                </button>
              )}
              {welcomeState === "preparing" && (
                <span className="inline-flex items-center gap-2 rounded-md border border-gold/40 px-5 py-2.5 text-sm text-gold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando recepção…
                </span>
              )}
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium tracking-wide transition hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com LEV
              </Link>
              <Link
                to="/briefings"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm text-foreground transition hover:bg-accent"
              >
                Ver briefings
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center shrink-0">
            <LevEmblem size={200} active={welcomeState === "speaking" || welcomeState === "preparing"} />
          </div>
          <div className="md:hidden self-center">
            <LevEmblem size={140} active={welcomeState === "speaking"} />
          </div>
        </section>

        {/* Cards */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <DashCard
            title="Briefing do Dia"
            eyebrow="Resumo"
            body="Ainda não há briefing para hoje. Gere um agora em Briefings."
            href="/briefings"
            icon={<Calendar className="h-5 w-5" />}
          />
          <DashCard
            title="Projetos em destaque"
            eyebrow={projectCount === null ? "Carregando…" : `${projectCount} projeto${projectCount === 1 ? "" : "s"}`}
            body={
              projectCount === 0
                ? "Crie seu primeiro projeto e LEV começa a acompanhar."
                : "Acompanhe status, prioridade e próximas ações."
            }
            href="/projetos"
            icon={<FolderKanban className="h-5 w-5" />}
          />
          <DashCard
            title="Próximos posts"
            eyebrow={postCount === null ? "Carregando…" : `${postCount} na fila`}
            body={
              postCount === 0
                ? "Comece um post para Instagram ou TikTok."
                : "Ideias, rascunhos e aprovados em um só lugar."
            }
            href="/redes"
            icon={<Sparkles className="h-5 w-5" />}
          />
          <DashCard
            title="Agenda"
            eyebrow="Hoje"
            body="Sincronize sua agenda em Configurações (em breve)."
            href="/configuracoes"
            icon={<Calendar className="h-5 w-5" />}
          />
          <DashCard
            title="Conversa com LEV"
            eyebrow="Direta"
            body="Estratégia, análise e voz. Fale por texto, microfone ou Modo Voz."
            href="/chat"
            icon={<MessageCircle className="h-5 w-5" />}
          />
        </div>
      </div>
    </AppShell>
  );
}

function DashCard({
  title,
  eyebrow,
  body,
  href,
  icon,
}: {
  title: string;
  eyebrow: string;
  body: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className="glass group relative overflow-hidden rounded-2xl p-6 transition hover:border-gold/40"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="rounded-lg border border-gold/30 bg-gold/10 p-2 text-gold">
          {icon}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-gold group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70 mb-2">
        {eyebrow}
      </p>
      <h3 className="font-serif text-2xl text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </Link>
  );
}
