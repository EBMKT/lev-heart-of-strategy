import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Volume2 } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  askLev,
  buildLevContext,
  loadLevConfig,
  speakWithLev,
  type LevConfig,
} from "@/lib/lev-ai";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/briefings")({
  head: () => ({
    meta: [
      { title: "Briefings — LEV" },
      { name: "description", content: "Briefings diários da manhã, tarde e noite." },
    ],
  }),
  component: BriefingsPage,
});

type Briefing = Database["public"]["Tables"]["briefings"]["Row"];

const PERIODO_LABEL: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

function currentPeriodo(): "manha" | "tarde" | "noite" {
  const h = new Date().getHours();
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
}

type BriefingContent = {
  agenda?: string;
  projetos?: string;
  redes?: string;
  foco?: string;
  texto?: string;
};

function BriefingsPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<LevConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("briefings")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(21);
    setBriefings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    loadLevConfig().then(setCfg);
  }, [refresh]);

  const generate = async () => {
    if (!cfg) return;
    setGenerating(true);
    setError(null);
    try {
      const periodo = currentPeriodo();
      const context = await buildLevContext();
      const prompt =
        `Gere o briefing da ${PERIODO_LABEL[periodo].toLowerCase()} de hoje (${new Date().toLocaleDateString("pt-BR")}).` +
        `\nResponda APENAS com JSON válido, sem markdown, no formato:` +
        `\n{"agenda":"…","projetos":"…","redes":"…","foco":"…","texto":"…"}` +
        `\nOnde: agenda = recomendação de organização do período; projetos = leitura estratégica do que precisa de atenção; redes = ideia ou lembrete de conteúdo para Instagram/TikTok; foco = a única coisa mais importante agora; texto = o briefing completo em 1 parágrafo fluido, como se você falasse em voz alta, terminando com uma frase estoica curta.`;
      const raw = await askLev(cfg, [{ role: "user", text: prompt }], context);
      const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const conteudo = JSON.parse(jsonStr) as BriefingContent;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const { error: e } = await supabase
        .from("briefings")
        .insert({ user_id: auth.user.id, periodo, conteudo });
      if (e) throw new Error(e.message);
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar briefing.");
    } finally {
      setGenerating(false);
    }
  };

  const play = async (b: Briefing) => {
    if (!cfg) return;
    const c = b.conteudo as BriefingContent;
    const text = c?.texto || [c?.agenda, c?.projetos, c?.foco].filter(Boolean).join(" ");
    if (!text) return;
    try {
      setError(null);
      setPlayingId(b.id);
      const audio = await speakWithLev(cfg, text);
      audio.onended = () => setPlayingId(null);
    } catch (e) {
      setPlayingId(null);
      setError(e instanceof Error ? e.message : "Falha ao reproduzir.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 md:px-10 py-10 md:py-14">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Briefings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manhã, tarde e noite — a leitura estratégica de LEV sobre o seu dia.
            </p>
          </div>
          <button
            onClick={() => void generate()}
            disabled={generating}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-gold-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar agora
          </button>
        </div>

        {error && (
          <p className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : briefings.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-accent/20 px-8 py-16 text-center">
            <p className="font-serif text-2xl text-foreground/90">Nenhum briefing ainda.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Toque em "Gerar agora" e LEV compõe o primeiro com base nos seus projetos e conteúdo.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {briefings.map((b) => {
              const c = b.conteudo as BriefingContent;
              return (
                <article key={b.id} className="rounded-2xl border border-border/40 bg-accent/20 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gold/80">
                        {PERIODO_LABEL[b.periodo]}
                      </p>
                      <p className="font-serif text-xl text-foreground">
                        {new Date(b.data + "T12:00:00").toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => void play(b)}
                      disabled={playingId === b.id}
                      title="Ouvir com a voz de LEV"
                      className="rounded-full border border-gold/50 p-3 text-gold transition hover:bg-gold/10 disabled:opacity-40"
                    >
                      {playingId === b.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
                    {c?.foco && (
                      <p className="border-l-2 border-gold/60 pl-3 font-medium text-gold">
                        Foco: {c.foco}
                      </p>
                    )}
                    {c?.agenda && <Section label="Agenda">{c.agenda}</Section>}
                    {c?.projetos && <Section label="Projetos">{c.projetos}</Section>}
                    {c?.redes && <Section label="Redes">{c.redes}</Section>}
                    {c?.texto && !c?.agenda && <p className="whitespace-pre-wrap">{c.texto}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p>{children}</p>
    </div>
  );
}
