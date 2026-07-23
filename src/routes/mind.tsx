import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Brain, Loader2, Plus, Sparkles } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { askLev, loadLevConfig, type LevConfig } from "@/lib/lev-ai";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/mind")({
  head: () => ({
    meta: [{ title: "Lev Mind — LEV" }, { name: "description", content: "Suas ideias, capturadas e organizadas." }],
  }),
  component: MindPage,
});

type MindItem = Database["public"]["Tables"]["mind_items"]["Row"];

function MindPage() {
  const [items, setItems] = useState<MindItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [conteudo, setConteudo] = useState("");
  const [cfg, setCfg] = useState<LevConfig | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("mind_items")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("arquivado", false)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    loadLevConfig().then(setCfg);
  }, [refresh]);

  const categories = useMemo(() => {
    const set = new Map<string, number>();
    for (const i of items) if (i.categoria) set.set(i.categoria, (set.get(i.categoria) ?? 0) + 1);
    return [...set.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = filter ? items.filter((i) => i.categoria === filter) : items;

  const capture = async () => {
    if (!conteudo.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("mind_items").insert({ user_id: auth.user.id, conteudo: conteudo.trim() });
    setConteudo("");
    void refresh();
  };

  const organize = async () => {
    if (!cfg) return;
    const pending = items.filter((i) => !i.categoria);
    if (pending.length === 0) return;
    setOrganizing(true);
    setError(null);
    try {
      const lista = pending.map((i, idx) => `${idx}: ${i.conteudo.slice(0, 300)}`).join("\n");
      const raw = await askLev(cfg, [
        {
          role: "user",
          text:
            `Organize estas ideias capturadas. Para cada uma, atribua UMA categoria curta entre: ministério, revelare, negócios, conteúdo, família, pessoal, financeiro, outra.` +
            ` E até 3 tags curtas.\nResponda APENAS com JSON válido: [{"i":0,"categoria":"…","tags":["…"]}, …]\n\nIdeias:\n${lista}`,
        },
      ]);
      const arr = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1)) as {
        i: number;
        categoria?: string;
        tags?: string[];
      }[];
      await Promise.all(
        arr.map((r) => {
          const item = pending[r.i];
          if (!item) return Promise.resolve(null);
          return supabase
            .from("mind_items")
            .update({ categoria: r.categoria ?? null, tags: r.tags ?? [] })
            .eq("id", item.id);
        }),
      );
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao organizar.");
    } finally {
      setOrganizing(false);
    }
  };

  const archive = async (id: string) => {
    await supabase.from("mind_items").update({ arquivado: true }).eq("id", id);
    void refresh();
  };

  const pendingCount = items.filter((i) => !i.categoria).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 md:px-8 py-8 md:py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl text-foreground">Lev Mind</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Despeje as ideias aqui. LEV captura, categoriza e nada se perde.
          </p>
        </div>

        {/* Captura */}
        <div className="mb-6 flex gap-2">
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void capture();
              }
            }}
            placeholder="Nova ideia… (Enter para capturar)"
            rows={2}
            className="flex-1 rounded-xl border border-border/60 bg-accent/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none"
          />
          <button
            onClick={() => void capture()}
            className="self-stretch rounded-xl bg-gold px-5 text-gold-foreground transition hover:opacity-90"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Organizar */}
        {pendingCount > 0 && (
          <button
            onClick={() => void organize()}
            disabled={organizing}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gold/50 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-40"
          >
            {organizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            LEV, organize {pendingCount} ideia{pendingCount > 1 ? "s" : ""} nova{pendingCount > 1 ? "s" : ""}
          </button>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Filtros */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs capitalize transition",
                !filter ? "border-gold/60 text-gold" : "border-border/60 text-muted-foreground",
              )}
            >
              Todas · {items.length}
            </button>
            {categories.map(([cat, n]) => (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? null : cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs capitalize transition",
                  filter === cat ? "border-gold/60 text-gold" : "border-border/60 text-muted-foreground",
                )}
              >
                {cat} · {n}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-accent/20 px-8 py-14 text-center">
            <Brain className="mx-auto mb-3 h-8 w-8 text-gold/50" />
            <p className="text-sm text-muted-foreground">
              Mente limpa. Quando a ideia vier, capture aqui — em qualquer hora.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((m) => (
              <div key={m.id} className="group glass rounded-2xl p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.conteudo}</p>
                <div className="mt-3 flex items-center gap-2">
                  {m.categoria && (
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-gold">
                      {m.categoria}
                    </span>
                  )}
                  {m.tags.map((t) => (
                    <span key={t} className="text-[10px] text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                  <button
                    onClick={() => void archive(m.id)}
                    title="Arquivar"
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-gold"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
