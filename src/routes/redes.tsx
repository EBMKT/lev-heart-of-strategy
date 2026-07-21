import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lev/app-shell";
import { PlaceholderScreen } from "./chat";

export const Route = createFileRoute("/redes")({
  head: () => ({ meta: [{ title: "Redes Sociais — LEV" }, { name: "description", content: "Planejamento de conteúdo Instagram e TikTok." }] }),
  component: () => (
    <AppShell>
      <PlaceholderScreen
        title="Redes Sociais"
        subtitle="Calendário e kanban de conteúdo — Instagram e TikTok."
      />
    </AppShell>
  ),
});
