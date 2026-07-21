import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Volume2, VolumeX, Loader2 } from "lucide-react";

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

function ChatPage() {
  const [cfg, setCfg] = useState<LevConfig | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<string>("");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLevConfig().then(setCfg);
    buildLevContext().then((c) => (contextRef.current = c));
    return () => stopLevVoice();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
    const history: Msg[] = [...messages, { role: "user", text }];
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

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setError("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript ?? "";
      setListening(false);
      if (transcript) void send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
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
                ? "border-gold/60 text-gold shadow-gold"
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
                Pergunte sobre seus projetos, peça um plano ou apenas pense em voz alta.
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
            title="Falar com LEV"
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
