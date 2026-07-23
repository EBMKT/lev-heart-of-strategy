import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, MicOff, Send, Volume2, VolumeX, Loader2, X } from "lucide-react";

import { AppShell } from "@/components/lev/app-shell";
import { LevEmblem } from "@/components/lev/emblem";
import { cn } from "@/lib/utils";
import {
  askLev,
  buildLevContext,
  loadLevConfig,
  speakWithLev,
  stopLevVoice,
  type LevConfig,
} from "@/lib/lev-ai";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [{ title: "Chat — LEV" }, { name: "description", content: "Converse com LEV por texto e voz." }],
  }),
  component: ChatPage,
});

type Msg = { role: "user" | "model"; text: string };
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

function getSR(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function ChatPage() {
  const [cfg, setCfg] = useState<LevConfig | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modo Voz (JARVIS)
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [lastHeard, setLastHeard] = useState("");
  const [lastReply, setLastReply] = useState("");
  const voiceModeRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const contextRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLevConfig().then(setCfg);
    buildLevContext().then((c) => (contextRef.current = c));
    return () => {
      voiceModeRef.current = false;
      recRef.current?.stop();
      stopLevVoice();
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Pergunta vinda da busca "Pergunte ao Lev…"
  useEffect(() => {
    if (!cfg) return;
    const q = sessionStorage.getItem("lev_ask");
    if (q) {
      sessionStorage.removeItem("lev_ask");
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  const play = async (text: string) => {
    if (!cfg) return;
    try {
      setError(null);
      setSpeaking(true);
      const audio = await speakWithLev(cfg, text);
      audio.onended = () => setSpeaking(false);
    } catch (e) {
      setSpeaking(false);
      setError(e instanceof Error ? e.message : "Falha ao reproduzir voz.");
    }
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy || !cfg) return;
    setInput("");
    setError(null);
    const history: Msg[] = [...messagesRef.current, { role: "user", text }];
    setMessages(history);
    setBusy(true);
    try {
      const reply = await askLev(cfg, history, contextRef.current);
      setMessages([...history, { role: "model", text: reply }]);
      if (autoVoice) void play(reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "LEV encontrou um problema.");
      setMessages(history);
    } finally {
      setBusy(false);
    }
  };

  // ---------- MODO VOZ (conversa contínua) ----------

  const listenOnce = () => {
    if (!voiceModeRef.current) return;
    const SR = getSR();
    if (!SR) {
      setError("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      exitVoiceMode();
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "pt-BR";
    rec.interimResults = false;
    let gotResult = false;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        gotResult = true;
        void voiceTurn(transcript.trim());
      }
    };
    rec.onend = () => {
      // Silêncio: volta a ouvir enquanto o modo voz estiver ativo
      if (voiceModeRef.current && !gotResult) {
        setTimeout(() => listenOnce(), 250);
      }
    };
    rec.onerror = () => {
      if (voiceModeRef.current && !gotResult) {
        setTimeout(() => listenOnce(), 600);
      }
    };
    setVoiceState("listening");
    try {
      rec.start();
    } catch {
      /* já iniciado */
    }
  };

  const voiceTurn = async (text: string) => {
    if (!cfg || !voiceModeRef.current) return;
    setLastHeard(text);
    setVoiceState("thinking");
    const history: Msg[] = [...messagesRef.current, { role: "user", text }];
    setMessages(history);
    try {
      const reply = await askLev(cfg, history, contextRef.current);
      if (!voiceModeRef.current) return;
      setMessages([...history, { role: "model", text: reply }]);
      setLastReply(reply);
      setVoiceState("speaking");
      const audio = await speakWithLev(cfg, reply);
      audio.onended = () => {
        if (voiceModeRef.current) listenOnce();
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "LEV encontrou um problema.");
      if (voiceModeRef.current) setTimeout(() => listenOnce(), 1200);
    }
  };

  const enterVoiceMode = () => {
    if (!cfg?.elevenKey || !cfg?.geminiKey) {
      setError("Para o Modo Voz, adicione as chaves do Gemini e do ElevenLabs em Ajustes.");
      return;
    }
    setError(null);
    setLastHeard("");
    setLastReply("");
    setVoiceMode(true);
    voiceModeRef.current = true;
    listenOnce();
  };

  const exitVoiceMode = () => {
    voiceModeRef.current = false;
    setVoiceMode(false);
    setVoiceState("idle");
    recRef.current?.stop();
    stopLevVoice();
  };

  // Toque durante a fala interrompe LEV e volta a ouvir
  const interrupt = () => {
    if (voiceState === "speaking") {
      stopLevVoice();
      listenOnce();
    }
  };

  // ---------- Microfone avulso (uma frase) ----------
  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = getSR();
    if (!SR) {
      setError("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript ?? "";
      setListening(false);
      if (transcript) void send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const VOICE_LABEL: Record<VoiceState, string> = {
    idle: "",
    listening: "Estou ouvindo…",
    thinking: "Pensando…",
    speaking: "Toque para interromper",
  };

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-3xl flex-col px-5 md:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border/40 pb-4">
          <LevEmblem size={44} active={speaking || busy} />
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-foreground">LEV</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-gold/70">
              {busy ? "pensando…" : speaking ? "falando…" : listening ? "ouvindo…" : "ao seu lado"}
            </p>
          </div>
          <button
            onClick={enterVoiceMode}
            className="flex items-center gap-2 rounded-full border border-gold/60 px-4 py-2.5 text-sm text-gold shadow-gold transition hover:bg-gold/10"
            title="Conversar por voz, mãos livres"
          >
            <AudioLines className="h-4 w-4" /> Modo Voz
          </button>
          <button
            onClick={() => {
              if (speaking) {
                stopLevVoice();
                setSpeaking(false);
              }
              setAutoVoice((v) => !v);
            }}
            title={autoVoice ? "Voz automática ativada" : "Voz automática desativada"}
            className={cn(
              "rounded-full border p-2.5 transition",
              autoVoice
                ? "border-gold/60 text-gold"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {autoVoice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto py-6">
          {messages.length === 0 && (
            <div className="mt-10 text-center">
              <p className="font-serif text-2xl text-foreground/90">Como posso servir hoje?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Toque em <span className="text-gold">Modo Voz</span> e fale comigo — ou escreva abaixo.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-gold text-gold-foreground rounded-br-sm"
                    : "bg-accent/60 text-foreground rounded-bl-sm border border-border/40",
                )}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.role === "model" && (
                  <button
                    onClick={() => void play(m.text)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-gold/80 transition hover:text-gold"
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Ouvir
                  </button>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-gold" /> LEV está pensando…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-2 rounded-2xl border border-border/60 bg-accent/30 px-3 py-2 backdrop-blur"
        >
          <button
            type="button"
            onClick={toggleMic}
            className={cn(
              "rounded-full p-2.5 transition",
              listening ? "bg-gold text-gold-foreground animate-pulse" : "text-muted-foreground hover:text-gold",
            )}
            title="Ditar uma mensagem"
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva para LEV…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-full bg-gold p-2.5 text-gold-foreground transition disabled:opacity-40"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* ---------- OVERLAY MODO VOZ ---------- */}
      {voiceMode && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/98 backdrop-blur-xl"
          onClick={interrupt}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              exitVoiceMode();
            }}
            className="absolute right-6 top-6 rounded-full border border-border/60 p-3 text-muted-foreground transition hover:text-foreground"
            title="Encerrar Modo Voz"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className={cn(
              "transition-transform duration-700",
              voiceState === "listening" && "scale-100",
              voiceState === "thinking" && "scale-90",
              voiceState === "speaking" && "scale-110",
            )}
          >
            <LevEmblem size={180} active={voiceState !== "idle"} />
          </div>

          <p
            className={cn(
              "mt-10 text-xs uppercase tracking-[0.4em]",
              voiceState === "listening" ? "text-gold animate-pulse" : "text-gold/70",
            )}
          >
            {VOICE_LABEL[voiceState]}
          </p>

          <div className="mt-8 max-w-xl px-8 text-center">
            {lastHeard && (
              <p className="mb-3 text-sm italic text-muted-foreground">“{lastHeard}”</p>
            )}
            {lastReply && voiceState !== "listening" && (
              <p className="max-h-40 overflow-y-auto text-base leading-relaxed text-foreground/90">
                {lastReply}
              </p>
            )}
            {!lastHeard && voiceState === "listening" && (
              <p className="text-sm text-muted-foreground">
                Pode falar naturalmente. Eu respondo e volto a te ouvir.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-6 max-w-md rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results?: { [i: number]: { [j: number]: { transcript?: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
