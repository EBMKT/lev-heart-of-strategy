import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { askLev, loadLevConfig, type LevConfig } from "@/lib/lev-ai";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/redes")({
  head: () => ({
    meta: [
      { title: "Redes Sociais — LEV" },
      { name: "description", content: "Planejamento de conteúdo Instagram e TikTok." },
    ],
  }),
  component: RedesPage,
});

type Post = Database["public"]["Tables"]["posts"]["Row"];
type PostStatus = Post["status"];

const COLUMNS: { value: PostStatus; label: string }[] = [
  { value: "ideia", label: "Ideia" },
  { value: "rascunho", label: "Rascunho" },
  { value: "aprovado", label: "Aprovado" },
  { value: "publicado", label: "Publicado" },
];

const PLATFORM_STYLE: Record<string, string> = {
  instagram: "bg-[oklch(0.6_0.2_350/0.15)] text-[oklch(0.75_0.15_350)]",
  tiktok: "bg-[oklch(0.7_0.12_200/0.15)] text-[oklch(0.8_0.1_200)]",
};

const field =
  "w-full rounded-lg border border-border/60 bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

function RedesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [cfg, setCfg] = useState<LevConfig | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    loadLevConfig().then(setCfg);
  }, [refresh]);

  const savePost = async () => {
    if (!editing?.titulo?.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const payload = {
      titulo: editing.titulo.trim(),
      plataforma: (editing.plataforma ?? "instagram") as Post["plataforma"],
      status: (editing.status ?? "ideia") as PostStatus,
      caption: editing.caption ?? null,
      hashtags: editing.hashtags ?? [],
      script: editing.script ?? null,
      scheduled_at: editing.scheduled_at ?? null,
    };
    const res = editing.id
      ? await supabase.from("posts").update(payload).eq("id", editing.id)
      : await supabase.from("posts").insert({ ...payload, user_id: auth.user.id });
    if (res.error) setError(res.error.message);
    else {
      setEditing(null);
      void refresh();
    }
  };

  const move = async (post: Post, dir: 1 | -1) => {
    const idx = COLUMNS.findIndex((c) => c.value === post.status);
    const next = COLUMNS[idx + dir];
    if (!next) return;
    await supabase.from("posts").update({ status: next.value }).eq("id", post.id);
    void refresh();
  };

  const remove = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    setEditing(null);
    void refresh();
  };

  const aiAssist = async () => {
    if (!cfg || !editing?.titulo?.trim()) return;
    setAiBusy(true);
    setError(null);
    try {
      const prompt =
        `Crie conteúdo para um post de ${editing.plataforma ?? "instagram"} com o tema: "${editing.titulo}".` +
        `\nResponda APENAS com JSON válido: {"caption":"…","hashtags":["…"],"script":"…"}` +
        `\ncaption = legenda pronta no tom de Eduard (pessoal, estratégico, sem clichês de coach);` +
        ` hashtags = 8 a 12 relevantes sem #; script = roteiro curto de vídeo (gancho, desenvolvimento, CTA).`;
      const raw = await askLev(cfg, [{ role: "user", text: prompt }]);
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as {
        caption?: string;
        hashtags?: string[];
        script?: string;
      };
      setEditing({
        ...editing,
        caption: json.caption ?? editing.caption,
        hashtags: json.hashtags ?? editing.hashtags,
        script: json.script ?? editing.script,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na criação com IA.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 md:px-10 py-10 md:py-14">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Redes Sociais</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Da ideia à publicação — Instagram e TikTok sob o comando de LEV.
            </p>
          </div>
          <button
            onClick={() => setEditing({ plataforma: "instagram", status: "ideia" })}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-gold-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo post
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
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {COLUMNS.map((col) => {
              const items = posts.filter((p) => p.status === col.value);
              return (
                <div key={col.value} className="rounded-2xl border border-border/40 bg-accent/10 p-3">
                  <p className="mb-3 px-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {col.label} <span className="text-gold">· {items.length}</span>
                  </p>
                  <div className="space-y-2.5">
                    {items.map((p) => (
                      <div
                        key={p.id}
                        className="group rounded-xl border border-border/40 bg-background/60 p-3.5 transition hover:border-gold/40"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest",
                              PLATFORM_STYLE[p.plataforma],
                            )}
                          >
                            {p.plataforma}
                          </span>
                          {p.scheduled_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(p.scheduled_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setEditing(p)}
                          className="block w-full text-left text-sm text-foreground transition group-hover:text-gold"
                        >
                          {p.titulo}
                        </button>
                        <div className="mt-2.5 flex items-center justify-between">
                          <button
                            onClick={() => void move(p, -1)}
                            disabled={col.value === "ideia"}
                            className="text-muted-foreground transition hover:text-gold disabled:opacity-20"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void move(p, 1)}
                            disabled={col.value === "publicado"}
                            className="text-muted-foreground transition hover:text-gold disabled:opacity-20"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-background p-6 shadow-gold">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-foreground">
                {editing.id ? "Editar post" : "Novo post"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={editing.titulo ?? ""}
                onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
                placeholder="Tema / título do post"
                className={field}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editing.plataforma ?? "instagram"}
                  onChange={(e) =>
                    setEditing({ ...editing, plataforma: e.target.value as Post["plataforma"] })
                  }
                  className={field}
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <select
                  value={editing.status ?? "ideia"}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as PostStatus })}
                  className={field}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="datetime-local"
                value={editing.scheduled_at ? editing.scheduled_at.slice(0, 16) : ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                className={field}
              />
              <button
                onClick={() => void aiAssist()}
                disabled={aiBusy || !editing.titulo?.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold/50 px-4 py-2.5 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-40"
              >
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                LEV cria caption, hashtags e roteiro
              </button>
              <textarea
                value={editing.caption ?? ""}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                placeholder="Caption"
                rows={4}
                className={field}
              />
              <textarea
                value={(editing.hashtags ?? []).join(" ")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    hashtags: e.target.value
                      .split(/[\s,]+/)
                      .map((h) => h.replace(/^#/, ""))
                      .filter(Boolean),
                  })
                }
                placeholder="Hashtags separadas por espaço"
                rows={2}
                className={field}
              />
              <textarea
                value={editing.script ?? ""}
                onChange={(e) => setEditing({ ...editing, script: e.target.value })}
                placeholder="Roteiro do vídeo"
                rows={4}
                className={field}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void savePost()}
                  className="flex-1 rounded-lg bg-gold py-3 text-sm font-medium text-gold-foreground transition hover:opacity-90"
                >
                  Salvar
                </button>
                {editing.id && (
                  <button
                    onClick={() => void remove(editing.id!)}
                    title="Excluir"
                    className="rounded-lg border border-border/60 px-4 text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
