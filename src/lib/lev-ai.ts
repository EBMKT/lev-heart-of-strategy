import { supabase } from "@/integrations/supabase/client";

export type LevConfig = {
  geminiKey?: string;
  elevenKey?: string;
  voiceId: string;
  tone: string;
  displayName: string;
};

export const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export async function loadLevConfig(): Promise<LevConfig | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, elevenlabs_voice_id, lev_tone")
      .eq("id", auth.user.id)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("config")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);
  const cfg = (settings?.config ?? {}) as Record<string, string>;
  return {
    geminiKey: cfg.gemini_api_key || undefined,
    elevenKey: cfg.elevenlabs_api_key || undefined,
    voiceId: profile?.elevenlabs_voice_id || DEFAULT_VOICE_ID,
    tone: profile?.lev_tone || "estrategico",
    displayName: profile?.display_name || "Eduard",
  };
}

const TONES: Record<string, string> = {
  estrategico:
    "Tom estratégico e sofisticado: direto, calmo, com visão de longo prazo. Estilo de um conselheiro estoico.",
  motivador:
    "Tom motivador e enérgico: encorajador, prático, celebra avanços e cobra ação com entusiasmo.",
  direto:
    "Tom minimalista e direto ao ponto: respostas curtas, sem rodeios, foco absoluto em ação.",
};

export function levSystemPrompt(cfg: LevConfig): string {
  return [
    `Você é LEV — o assistente estratégico pessoal de ${cfg.displayName}.`,
    `O nome LEV significa "leão" nas línguas eslavas e "coração" em hebraico: estratégia com coração.`,
    `Você conhece os projetos, a rotina e as ambições de ${cfg.displayName}, e responde sempre em português brasileiro.`,
    TONES[cfg.tone] ?? TONES.estrategico,
    `Seja conciso. Quando fizer sentido, sugira a próxima ação concreta. Nunca use listas longas quando duas frases resolvem.`,
  ].join(" ");
}

type ChatMessage = { role: "user" | "model"; text: string };

// Modelos em ordem de preferência — usa o primeiro que a chave aceitar
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.5-pro",
];
let workingModel: string | null = null;

async function geminiCall(
  cfg: LevConfig,
  model: string,
  body: unknown,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function askLev(
  cfg: LevConfig,
  history: ChatMessage[],
  extraContext?: string,
): Promise<string> {
  if (!cfg.geminiKey) {
    throw new Error(
      "Adicione sua chave do Google Gemini em Ajustes para conversar com LEV (há plano gratuito em aistudio.google.com).",
    );
  }
  const body = {
    systemInstruction: {
      parts: [
        {
          text:
            levSystemPrompt(cfg) +
            (extraContext ? `\n\nContexto atual de ${cfg.displayName}:\n${extraContext}` : ""),
        },
      ],
    },
    contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.7 },
  };

  const models = workingModel
    ? [workingModel, ...GEMINI_MODELS.filter((m) => m !== workingModel)]
    : GEMINI_MODELS;

  let lastStatus = 0;
  for (const model of models) {
    const res = await geminiCall(cfg, model, body);
    if (res.ok) {
      workingModel = model;
      const json = await res.json();
      const text: string =
        json?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";
      if (!text) throw new Error("LEV não conseguiu responder agora. Tente novamente.");
      return text;
    }
    lastStatus = res.status;
    // 404 = modelo indisponível para esta chave → tenta o próximo; outros erros param aqui
    if (res.status !== 404) break;
  }

  if (lastStatus === 400 || lastStatus === 403) {
    throw new Error("Chave do Gemini inválida ou sem permissão. Gere uma nova em aistudio.google.com e cole em Ajustes.");
  }
  if (lastStatus === 429) {
    throw new Error("Limite gratuito do Gemini atingido por agora. Aguarde um minuto e tente de novo.");
  }
  throw new Error(`LEV não alcançou o Gemini (HTTP ${lastStatus}). Verifique sua chave em Ajustes.`);
}

/** Monta um resumo dos dados atuais (projetos + posts) para dar contexto ao LEV. */
export async function buildLevContext(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "";
  const [{ data: projects }, { data: posts }] = await Promise.all([
    supabase
      .from("projects")
      .select("nome, descricao, status, prioridade, progresso, proximas_acoes")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("posts")
      .select("titulo, plataforma, status, scheduled_at")
      .eq("user_id", auth.user.id)
      .neq("status", "publicado")
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);
  const parts: string[] = [];
  if (projects?.length) {
    parts.push(
      "PROJETOS:\n" +
        projects
          .map(
            (p) =>
              `- ${p.nome} [${p.status}, prioridade ${p.prioridade}, ${p.progresso}%]` +
              (p.descricao ? ` — ${p.descricao}` : "") +
              (Array.isArray(p.proximas_acoes) && p.proximas_acoes.length
                ? ` | próximas ações: ${(p.proximas_acoes as string[]).join("; ")}`
                : ""),
          )
          .join("\n"),
    );
  }
  if (posts?.length) {
    parts.push(
      "POSTS EM ANDAMENTO:\n" +
        posts
          .map(
            (p) =>
              `- [${p.plataforma}/${p.status}] ${p.titulo}` +
              (p.scheduled_at ? ` (agendado: ${new Date(p.scheduled_at).toLocaleDateString("pt-BR")})` : ""),
          )
          .join("\n"),
    );
  }
  return parts.join("\n\n");
}

let currentAudio: HTMLAudioElement | null = null;

export function stopLevVoice() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export async function speakWithLev(cfg: LevConfig, text: string): Promise<HTMLAudioElement> {
  if (!cfg.elevenKey) {
    throw new Error("Adicione sua chave do ElevenLabs em Ajustes para ouvir a voz de LEV.");
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": cfg.elevenKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) {
    throw new Error("ElevenLabs recusou a solicitação. Verifique a chave e a voz em Ajustes.");
  }
  const blob = await res.blob();
  stopLevVoice();
  const audio = new Audio(URL.createObjectURL(blob));
  currentAudio = audio;
  await audio.play();
  return audio;
}

export async function listElevenVoices(
  key: string,
): Promise<{ voice_id: string; name: string }[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": key },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.voices ?? []).map((v: { voice_id: string; name: string }) => ({
    voice_id: v.voice_id,
    name: v.name,
  }));
}
