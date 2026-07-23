import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Loader2, Plus, X } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/ministracoes")({
  head: () => ({
    meta: [
      { title: "Ministrações — LEV" },
      { name: "description", content: "Suas anotações da Palavra, sincronizadas do REVELARE." },
    ],
  }),
  component: MinistracoesPage,
});

type Ministracao = Database["public"]["Tables"]["ministracoes"]["Row"];

const field =
  "w-full rounded-lg border border-border/60 bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

function MinistracoesPage() {
  const [items, setItems] = useState<Ministracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ministracao | null>(null);
  const [creating, setCreating] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [conteudo, setConteudo] = useState("");

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("ministracoes")
      .select("*")
      .order("data_origem", { ascending: false, nullsFirst: false })
      .limit(100);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async () => {
    if (!titulo.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("ministracoes").insert({
      user_id: auth.user?.id ?? null,
      titulo: titulo.trim(),
      referencia: referencia.trim() || null,
      conteudo: conteudo.trim() || null,
      origem: "lev",
      data_origem: new Date().toISOString(),
    });
    setCreating(false);
    setTitulo("");
    setReferencia("");
    setConteudo("");
    void refresh();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-5 md:px-8 py-8 md:py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Ministrações</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu caderno da Palavra — sincronizado diariamente com o REVELARE.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-gold-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-accent/20 px-8 py-14 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-gold/50" />
            <p className="text-sm text-muted-foreground">
              Suas anotações do REVELARE aparecem aqui após a sincronização diária.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="group rounded-2xl border border-border/40 bg-accent/20 p-5 text-left transition hover:border-gold/40"
              >
                <div className="mb-2 flex items-center justify-between">
                  {m.referencia ? (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gold/80">{m.referencia}</span>
                  ) : (
                    <span />
                  )}
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest",
                      m.origem === "revelare"
                        ? "border-gold/30 text-gold/80"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {m.origem === "revelare" ? "Revelare" : "LEV"}
                  </span>
                </div>
                <h3 className="font-serif text-xl text-foreground transition group-hover:text-gold">{m.titulo}</h3>
                {m.conteudo && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{m.conteudo}</p>
                )}
                {m.data_origem && (
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    {new Date(m.data_origem).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leitura */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-background/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-background p-8 shadow-gold">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                {selected.referencia && (
                  <p className="mb-1 text-xs uppercase tracking-[0.25em] text-gold/80">{selected.referencia}</p>
                )}
                <h2 className="font-serif text-3xl text-foreground">{selected.titulo}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {selected.conteudo || "Sem conteúdo."}
            </p>
          </div>
        </div>
      )}

      {/* Nova ministração */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-background/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-background p-6 shadow-gold">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-foreground">Nova ministração</h2>
              <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className={field} />
              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Referência bíblica (ex.: Romanos 8:28-30)"
                className={field}
              />
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Conteúdo da ministração…"
                rows={8}
                className={field}
              />
              <button
                onClick={() => void create()}
                className="w-full rounded-lg bg-gold py-3 text-sm font-medium text-gold-foreground transition hover:opacity-90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
