import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [{ title: "Agenda — LEV" }, { name: "description", content: "Seus compromissos, dia a dia." }],
  }),
  component: AgendaPage,
});

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];

const field =
  "w-full rounded-lg border border-border/60 bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function AgendaPage() {
  const [day, setDay] = useState(() => new Date());
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("");
  const [detalhe, setDetalhe] = useState("");

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("agenda_items")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("data", iso(day))
      .order("hora", { ascending: true, nullsFirst: false });
    setItems(data ?? []);
    setLoading(false);
  }, [day]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = async () => {
    if (!titulo.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("agenda_items").insert({
      user_id: auth.user.id,
      titulo: titulo.trim(),
      detalhe: detalhe.trim() || null,
      data: iso(day),
      hora: hora || null,
    });
    setTitulo("");
    setHora("");
    setDetalhe("");
    void refresh();
  };

  const toggle = async (item: AgendaItem) => {
    await supabase.from("agenda_items").update({ concluido: !item.concluido }).eq("id", item.id);
    void refresh();
  };

  const remove = async (id: string) => {
    await supabase.from("agenda_items").delete().eq("id", id);
    void refresh();
  };

  const shift = (n: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + n);
    setDay(d);
  };

  const isToday = iso(day) === iso(new Date());

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 md:px-8 py-8 md:py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Agenda</h1>
            <p className="mt-1 text-sm text-muted-foreground">Cada hora a serviço do que importa.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="rounded-lg border border-border/60 p-2 text-muted-foreground hover:text-gold">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDay(new Date())}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                isToday ? "border-gold/50 text-gold" : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              Hoje
            </button>
            <button onClick={() => shift(1)} className="rounded-lg border border-border/60 p-2 text-muted-foreground hover:text-gold">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-gold/80 capitalize">
          {day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {/* Novo compromisso */}
        <div className="mb-8 grid gap-3 rounded-2xl border border-border/40 bg-accent/20 p-4 md:grid-cols-[110px_1fr_auto]">
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={field} />
          <div className="space-y-2">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void add()}
              placeholder="Novo compromisso…"
              className={field}
            />
            <input
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              placeholder="Detalhe (opcional)"
              className={field}
            />
          </div>
          <button
            onClick={() => void add()}
            className="self-start rounded-lg bg-gold px-4 py-2.5 text-gold-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-border/40 bg-accent/20 px-8 py-12 text-center text-sm text-muted-foreground">
            Dia livre. Use-o com intenção.
          </p>
        ) : (
          <div>
            {items.map((a, i) => (
              <div key={a.id} className="group relative flex gap-4 pb-5">
                {i < items.length - 1 && (
                  <span className="absolute left-[3.3rem] top-7 bottom-0 w-px bg-border/40" />
                )}
                <span className="w-14 shrink-0 pt-1 text-right text-sm text-muted-foreground">
                  {a.hora ? a.hora.slice(0, 5) : "—"}
                </span>
                <button
                  onClick={() => void toggle(a)}
                  className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                    a.concluido ? "border-gold bg-gold text-gold-foreground" : "border-gold/50 hover:bg-gold/20",
                  )}
                >
                  {a.concluido && <Check className="h-3 w-3" />}
                </button>
                <div className="flex-1 pt-0.5">
                  <p className={cn("text-foreground", a.concluido && "line-through opacity-50")}>{a.titulo}</p>
                  {a.detalhe && <p className="text-sm text-muted-foreground">{a.detalhe}</p>}
                </div>
                <button
                  onClick={() => void remove(a.id)}
                  className="self-start pt-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
