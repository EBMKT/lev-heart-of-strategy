import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lev/app-shell";
import { LevEmblem } from "@/components/lev/emblem";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — LEV" }, { name: "description", content: "Converse com LEV." }] }),
  component: () => (
    <AppShell>
      <PlaceholderScreen
        title="Chat com LEV"
        subtitle="Conversa por texto e voz — em breve nesta fase."
      />
    </AppShell>
  ),
});

export function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 md:px-10 py-16 md:py-24 text-center">
      <div className="flex justify-center mb-8">
        <LevEmblem size={120} active />
      </div>
      <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">{title}</h1>
      <p className="text-muted-foreground max-w-lg mx-auto">{subtitle}</p>
      <p className="mt-8 text-xs uppercase tracking-[0.3em] text-gold/70">
        Fase seguinte da construção
      </p>
    </div>
  );
}
