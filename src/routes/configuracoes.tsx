import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, User, Volume2 } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_VOICE_ID,
  listElevenVoices,
  loadLevConfig,
  speakWithLev,
} from "@/lib/lev-ai";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [{ title: "Configurações — LEV" }, { name: "description", content: "Ajustes de LEV, voz e perfil." }],
  }),
  component: SettingsPage,
});

const TONES = [
  { value: "estrategico", label: "Estratégico — conselheiro estoico, calmo e direto" },
  { value: "motivador", label: "Motivador — enérgico, celebra e cobra ação" },
  { value: "direto", label: "Direto — minimalista, sem rodeios" },
];

function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [tone, setTone] = useState("estrategico");
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID);
  const [elevenKey, setElevenKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [voices, setVoices] = useState<{ voice_id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLevConfig().then((cfg) => {
      if (!cfg) return;
      setDisplayName(cfg.displayName);
      setTone(cfg.tone);
      setVoiceId(cfg.voiceId);
      setElevenKey(cfg.elevenKey ?? "");
      setGeminiKey(cfg.geminiKey ?? "");
      if (cfg.elevenKey) void listElevenVoices(cfg.elevenKey).then(setVoices);
    });
  }, []);

  const refreshVoices = async () => {
    if (!elevenKey) return;
    const v = await listElevenVoices(elevenKey);
    setVoices(v);
    if (v.length === 0) setError("Não consegui listar vozes — confira a chave ElevenLabs.");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada — entre novamente.");
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase
          .from("profiles")
          .update({ display_name: displayName, lev_tone: tone, elevenlabs_voice_id: voiceId })
          .eq("id", auth.user.id),
        supabase.from("settings").upsert({
          user_id: auth.user.id,
          config: { elevenlabs_api_key: elevenKey, gemini_api_key: geminiKey },
        }),
      ]);
      if (e1 || e2) throw new Error((e1 ?? e2)?.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const testVoice = async () => {
    setTesting(true);
    setError(null);
    try {
      const audio = await speakWithLev(
        { elevenKey, voiceId, geminiKey, tone, displayName },
        `Olá, ${displayName || "Eduard"}. Aqui é LEV. Estratégia com coração — estou pronto.`,
      );
      audio.onended = () => setTesting(false);
    } catch (e) {
      setTesting(false);
      setError(e instanceof Error ? e.message : "Falha no teste de voz.");
    }
  };

  const field =
    "w-full rounded-lg border border-border/60 bg-accent/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 md:px-8 py-10 md:py-14">
        <h1 className="font-serif text-4xl text-foreground mb-2">Configurações</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Suas chaves ficam guardadas na sua conta, protegidas por login — só você as acessa.
        </p>

        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold/80">
            <User className="h-4 w-4" /> Perfil
          </h2>
          <label className="mb-1.5 block text-xs text-muted-foreground">Como LEV deve te chamar</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={field} />
          <label className="mb-1.5 mt-4 block text-xs text-muted-foreground">Tom de LEV</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className={field}>
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold/80">
            <KeyRound className="h-4 w-4" /> Chaves de API
          </h2>
          <label className="mb-1.5 block text-xs text-muted-foreground">
            Google Gemini (inteligência do chat e briefings — gratuito em aistudio.google.com)
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza…"
            className={field}
          />
          <label className="mb-1.5 mt-4 block text-xs text-muted-foreground">
            ElevenLabs (voz de LEV — elevenlabs.io)
          </label>
          <input
            type="password"
            value={elevenKey}
            onChange={(e) => setElevenKey(e.target.value)}
            onBlur={() => void refreshVoices()}
            placeholder="sk_…"
            className={field}
          />
        </section>

        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold/80">
            <Volume2 className="h-4 w-4" /> Voz
          </h2>
          {voices.length > 0 ? (
            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={field}>
              {voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="ID da voz ElevenLabs"
              className={field}
            />
          )}
          <button
            onClick={() => void testVoice()}
            disabled={testing || !elevenKey}
            className="mt-4 flex items-center gap-2 rounded-lg border border-gold/50 px-4 py-2 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-40"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            Testar voz de LEV
          </button>
        </section>

        {error && (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <button
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-medium text-gold-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "Salvo" : "Salvar configurações"}
        </button>
      </div>
    </AppShell>
  );
}
