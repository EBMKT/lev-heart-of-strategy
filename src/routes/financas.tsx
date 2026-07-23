import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/financas")({
  head: () => ({
    meta: [{ title: "Finanças — LEV" }, { name: "description", content: "Entradas, saídas e saldo sob controle." }],
  }),
  component: FinancasPage,
});

type Transacao = Database["public"]["Tables"]["transacoes"]["Row"];

const CATEGORIAS = ["geral", "ministério", "construção", "revelare", "investimentos", "família", "pessoal"];

const field =
  "w-full rounded-lg border border-border/60 bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinancasPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [items, setItems] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("geral");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));

  const first = `${month.y}-${String(month.m + 1).padStart(2, "0")}-01`;
  const nextM = month.m === 11 ? { y: month.y + 1, m: 0 } : { y: month.y, m: month.m + 1 };
  const next = `${nextM.y}-${String(nextM.m + 1).padStart(2, "0")}-01`;

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: rows } = await supabase
      .from("transacoes")
      .select("*")
      .eq("user_id", auth.user.id)
      .gte("data", first)
      .lt("data", next)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    setItems(rows ?? []);
    setLoading(false);
  }, [first, next]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const entradas = items.filter((i) => i.tipo === "entrada").reduce((s, i) => s + Number(i.valor), 0);
    const saidas = items.filter((i) => i.tipo === "saida").reduce((s, i) => s + Number(i.valor), 0);
    const porCategoria = new Map<string, number>();
    for (const i of items.filter((x) => x.tipo === "saida")) {
      porCategoria.set(i.categoria, (porCategoria.get(i.categoria) ?? 0) + Number(i.valor));
    }
    return { entradas, saidas, saldo: entradas - saidas, porCategoria };
  }, [items]);

  const add = async () => {
    const v = Number(valor.replace(",", "."));
    if (!descricao.trim() || !v || v <= 0) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("transacoes").insert({
      user_id: auth.user.id,
      tipo,
      descricao: descricao.trim(),
      categoria,
      valor: v,
      data,
    });
    setDescricao("");
    setValor("");
    void refresh();
  };

  const remove = async (id: string) => {
    await supabase.from("transacoes").delete().eq("id", id);
    void refresh();
  };

  const shiftMonth = (n: number) => {
    const d = new Date(month.y, month.m + n, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  const monthLabel = new Date(month.y, month.m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-5 md:px-8 py-8 md:py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Finanças</h1>
            <p className="mt-1 text-sm text-muted-foreground">Mordomia fiel sobre cada recurso.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-border/60 p-2 text-muted-foreground hover:text-gold">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-36 text-center text-sm capitalize text-foreground">{monthLabel}</span>
            <button onClick={() => shiftMonth(1)} className="rounded-lg border border-border/60 p-2 text-muted-foreground hover:text-gold">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Totais */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="glass rounded-2xl p-5">
            <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-[oklch(0.7_0.15_150)]" /> Entradas
            </p>
            <p className="font-serif text-3xl text-[oklch(0.7_0.15_150)]">{brl(totals.entradas)}</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <ArrowDownRight className="h-3.5 w-3.5 text-destructive" /> Saídas
            </p>
            <p className="font-serif text-3xl text-destructive">{brl(totals.saidas)}</p>
          </div>
          <div className="glass rounded-2xl border-gold/30 p-5">
            <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-gold/80">Saldo do mês</p>
            <p className={cn("font-serif text-3xl", totals.saldo >= 0 ? "text-gold" : "text-destructive")}>
              {brl(totals.saldo)}
            </p>
          </div>
        </div>

        {/* Por categoria */}
        {totals.porCategoria.size > 0 && (
          <div className="mb-8 glass rounded-2xl p-5">
            <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-gold/80">Saídas por categoria</p>
            <div className="space-y-2.5">
              {[...totals.porCategoria.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-28 text-xs capitalize text-muted-foreground">{cat}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40">
                      <div
                        className="h-full bg-gradient-gold"
                        style={{ width: `${Math.round((val / totals.saidas) * 100)}%` }}
                      />
                    </div>
                    <span className="w-28 text-right text-xs text-foreground">{brl(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Nova transação */}
        <div className="mb-8 rounded-2xl border border-border/40 bg-accent/20 p-4">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setTipo("entrada")}
              className={cn(
                "flex-1 rounded-lg border py-2 text-sm transition",
                tipo === "entrada"
                  ? "border-[oklch(0.7_0.15_150/0.6)] bg-[oklch(0.7_0.15_150/0.12)] text-[oklch(0.75_0.15_150)]"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              Entrada
            </button>
            <button
              onClick={() => setTipo("saida")}
              className={cn(
                "flex-1 rounded-lg border py-2 text-sm transition",
                tipo === "saida"
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              Saída
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_130px_150px_140px_auto]">
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void add()}
              placeholder="Descrição…"
              className={field}
            />
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="decimal"
              placeholder="Valor"
              className={field}
            />
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={field}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={field} />
            <button
              onClick={() => void add()}
              className="rounded-lg bg-gold px-4 py-2.5 text-gold-foreground transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-border/40 bg-accent/20 px-8 py-12 text-center text-sm text-muted-foreground">
            Nenhum lançamento neste mês.
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-4 rounded-xl border border-border/30 bg-accent/10 px-4 py-3"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    t.tipo === "entrada"
                      ? "bg-[oklch(0.7_0.15_150/0.15)] text-[oklch(0.75_0.15_150)]"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  {t.tipo === "entrada" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{t.descricao}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {t.categoria} · {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    t.tipo === "entrada" ? "text-[oklch(0.75_0.15_150)]" : "text-destructive",
                  )}
                >
                  {t.tipo === "entrada" ? "+" : "−"} {brl(Number(t.valor))}
                </p>
                <button
                  onClick={() => void remove(t.id)}
                  className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
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
