import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lev/app-shell";
import { PlaceholderScreen } from "./chat";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — LEV" }, { name: "description", content: "Ajustes de LEV, voz e perfil." }] }),
  component: () => (
    <AppShell>
      <PlaceholderScreen
        title="Configurações"
        subtitle="Voz ElevenLabs, tom de LEV e perfil."
      />
    </AppShell>
  ),
});
