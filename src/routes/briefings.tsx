import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lev/app-shell";
import { PlaceholderScreen } from "./chat";

export const Route = createFileRoute("/briefings")({
  head: () => ({ meta: [{ title: "Briefings — LEV" }, { name: "description", content: "Briefings diários da manhã, tarde e noite." }] }),
  component: () => (
    <AppShell>
      <PlaceholderScreen
        title="Briefings"
        subtitle="Manhã, tarde e noite — resumos estratégicos com voz de LEV."
      />
    </AppShell>
  ),
});
