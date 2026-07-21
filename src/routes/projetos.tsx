import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { askLev, loadLevConfig, type LevConfig } from "@/lib/lev-ai";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/projetos")({
  head: () => ({
    meta: [{ title: "Projetos — LEV" }, { name: "description", content: "Gerencie seus projetos com LEV." }],
  }),
  component: ProjectsPage,
});

type Project = Database["public"]["Tables"]["projects"]["Row"];
type ProjectUpdate = Database["public"]["Tables"]["project_updates"]["Row"];

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  concluido: "Concluído",
  arquivado: "Arquivado",
};
const PRIORITY_COLOR: Record<string, string> = {
  baixa: "text-muted-foreground border-border/60",
  media: "text-foreground border-border",
  alta: "text-gold border-gold/50",
  critica: "text-destructive border-destructive/50",
};

const field =
  "w-full rounded-lg border border-border/60 bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [cfg, setCfg] = useState<LevConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", auth.user.id)
      .neq("status", "arquivado")
      .order("prioridade", { ascending: false })
      .order("updated_at", { ascending: false });
    setProjects(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    loadLevConfig().then(setCfg);
  }, [refresh]);

  const saveProject = async () => {
    if (!editing?.nome?.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const payload = {
      nome: editing.nome.trim(),
      descricao: editing.descricao ?? null,
      status: (editing.status ?? "ativo") as Project["status"],
      prioridade: (editing.prioridade ?? "media") as Project["prioridade"],
      progresso: editing.progresso ?? 0,
      proximas_acoes: editing.proximas_acoes ?? [],
    };
    const res = editing.id
      ? await supabase.from("projects").update(payload).eq("id", editing.id)
      : await supabase.from("projects").insert({ ...payload, user_id: auth.user.id });
    if (res.error) setError(res.error.message);
    else {
      setEditing(null);
      void refresh();
    }
  };

  const removeProject = async (id: string) => {
    await supabase.from("projects").update({ status: "arquivado" }).eq("id", id);
    setSelected(null);
    void refresh();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 md:px-10 py-10 md:py-14">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Projetos</h1>
            <p className="mt-1 text-sm text-muted-foreground">Cada projeto sob o olhar estratégico de LEV.</p>
          </div>
          <button
            onClick={() => setEditing({ status: "ativo", prioridade: "media", progresso: 0 })}
            className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-gold-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo projeto
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
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-accent/20 px-8 py-16 text-center">
            <p className="font-serif text-2xl text-foreground/90">Nenhum projeto ainda.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie o primeiro e LEV começa a acompanhá-lo diariamente.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="group rounded-2xl border border-border/40 bg-accent/20 p-6 text-left transition hover:border-gold/40"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-widest",
                      PRIORITY_COLOR[p.prioridade],
                    )}
                  >
                    {p.prioridade}
                  </span>
                  <span className="text-xs text-muted-foreground">{STATUS_LABEL[p.status]}</span>
                </div>
                <h3 className="font-serif text-xl text-foreground group-hover:text-gold transition">{p.nome}</h3>
                {p.descricao && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.descricao}</p>
                )}
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span className="text-gold">{p.progresso}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border/40">
                    <div className="h-full bg-gradient-gold transition-all" style={{ width: `${p.progresso}%` }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar projeto" : "Novo projeto"}>
          <div className="space-y-4">
            <input
              value={editing.nome ?? ""}
              onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
              placeholder="Nome do projeto"
              className={field}
            />
            <textarea
              value={editing.descricao ?? ""}
              onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
              placeholder="Descrição / objetivo"
              rows={3}
              className={field}
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={editing.status ?? "ativo"}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as Project["status"] })}
                className={field}
              >
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                value={editing.prioridade ?? "media"}
                onChange={(e) =>
                  setEditing({ ...editing, prioridade: e.target.value as Project["prioridade"] })
                }
                className={field}
              >
                <option value="baixa">Prioridade baixa</option>
                <option value="media">Prioridade média</option>
                <option value="alta">Prioridade alta</option>
                <option value="critica">Prioridade crítica</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Progresso: <span className="text-gold">{editing.progresso ?? 0}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={editing.progresso ?? 0}
                onChange={(e) => setEditing({ ...editing, progresso: Number(e.target.value) })}
                className="w-full accent-[oklch(0.78_0.095_82)]"
              />
            </div>
            <textarea
              value={((editing.proximas_acoes as string[]) ?? []).join("\n")}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  proximas_acoes: e.target.value.split("\n").filter((l) => l.trim() !== ""),
                })
              }
              placeholder="Próximas ações (uma por linha)"
              rows={3}
              className={field}
            />
            <button
              onClick={() => void saveProject()}
              className="w-full rounded-lg bg-gold py-3 text-sm font-medium text-gold-foreground transition hover:opacity-90"
            >
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {selected && (
        <ProjectDetail
          project={selected}
          cfg={cfg}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
          onArchive={() => void removeProject(selected.id)}
        />
      )}
    </AppShell>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-background p-6 shadow-gold">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProjectDetail({
  project,
  cfg,
  onClose,
  onEdit,
  onArchive,
}: {
  project: Project;
  cfg: LevConfig | null;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setUpdates(data ?? []);
  }, [project.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addUpdate = async () => {
    if (!newUpdate.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase
      .from("project_updates")
      .insert({ project_id: project.id, user_id: auth.user.id, conteudo: newUpdate.trim() });
    setNewUpdate("");
    void refresh();
  };

  const analyze = async () => {
    if (!cfg) return;
    setAnalyzing(true);
    setError(null);
    try {
      const historico = updates
        .slice(0, 10)
        .map((u) => `- ${new Date(u.created_at).toLocaleDateString("pt-BR")}: ${u.conteudo}`)
        .join("\n");
      const prompt =
        `Analise o projeto "${project.nome}" (status ${project.status}, prioridade ${project.prioridade}, progresso ${project.progresso}%).` +
        (project.descricao ? ` Objetivo: ${project.descricao}.` : "") +
        (historico ? `\nAtualizações recentes:\n${historico}` : "\nSem atualizações registradas.") +
        `\n\nDê uma análise estratégica curta (máx. 5 frases): estado real, risco principal e a próxima ação mais valiosa.`;
      const analysis = await askLev(cfg, [{ role: "user", text: prompt }]);
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("project_updates").insert({
          project_id: project.id,
          user_id: auth.user.id,
          conteudo: "Análise de LEV",
          ai_analysis: analysis,
        });
      }
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Modal title={project.nome} onClose={onClose}>
      {project.descricao && <p className="mb-4 text-sm text-muted-foreground">{project.descricao}</p>}

      {Array.isArray(project.proximas_acoes) && (project.proximas_acoes as string[]).length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gold/80">Próximas ações</p>
          {(project.proximas_acoes as string[]).map((a, i) => (
            <p key={i} className="text-sm text-foreground/90">
              · {a}
            </p>
          ))}
        </div>
      )}

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => void analyze()}
          disabled={analyzing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold/50 px-4 py-2.5 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-40"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Análise de LEV
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg border border-border/60 px-4 py-2.5 text-sm text-foreground transition hover:border-gold/40"
        >
          Editar
        </button>
        <button
          onClick={onArchive}
          title="Arquivar"
          className="rounded-lg border border-border/60 px-3 py-2.5 text-muted-foreground transition hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mb-4 flex gap-2">
        <input
          value={newUpdate}
          onChange={(e) => setNewUpdate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addUpdate()}
          placeholder="Registrar atualização de hoje…"
          className={field}
        />
        <button
          onClick={() => void addUpdate()}
          className="rounded-lg bg-gold px-4 text-sm font-medium text-gold-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {updates.map((u) => (
          <div key={u.id} className="rounded-xl border border-border/40 bg-accent/20 p-4">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              {new Date(u.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
            <p className="text-sm text-foreground/90">{u.conteudo}</p>
            {u.ai_analysis && (
              <p className="mt-2 border-l-2 border-gold/50 pl-3 text-sm italic text-gold/90 whitespace-pre-wrap">
                {u.ai_analysis}
              </p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
