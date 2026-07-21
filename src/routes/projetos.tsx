import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lev/app-shell";
import { PlaceholderScreen } from "./chat";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: [{ title: "Projetos — LEV" }, { name: "description", content: "Gerencie seus projetos com LEV." }] }),
  component: () => (
    <AppShell>
      <PlaceholderScreen
        title="Projetos"
        subtitle="Gestão completa dos seus projetos com análise diária de LEV."
      />
    </AppShell>
  ),
});
