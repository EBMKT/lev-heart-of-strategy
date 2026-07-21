# LEV — Central de Comando Pessoal de IA

Aplicativo premium pt-BR para Eduard. Escopo grande — proponho construir em fases coerentes, cada uma entregando algo utilizável.

## Assunções (me corrija se preciso)

- Autenticação: e-mail/senha simples (só Eduard usa). Sem Google OAuth por enquanto.
- Chave da ElevenLabs: Eduard adiciona em Project Settings → Secrets como `ELEVENLABS_API_KEY`. A voz é selecionada em Configurações (ID salvo no perfil).
- IA: Lovable AI Gateway (`google/gemini-2.5-flash` por padrão para custo, `gemini-2.5-pro` para briefings). Sem chave adicional.
- Reconhecimento de voz: Web Speech API do navegador (pt-BR) — nativo, sem serviço externo.
- Design tokens: fundo #0A0B0D, dourado #C9A96E, serif (Cormorant Garamond) para títulos + Inter para corpo. Vidro sutil, animações refinadas.

## Design System (fase 0 — sempre primeiro)

- Reescrever `src/styles.css` com paleta charcoal + dourado em oklch, tokens de glass (`--glass-bg`, `--glass-border`, `--shadow-elegant`, `--gradient-gold`).
- Fontes via `<link>` no `__root.tsx` head (Cormorant Garamond + Inter).
- Variantes shadcn: botão `gold`/`ghost-gold`, card `glass`.
- Componente `LevEmblem` (SVG geométrico com leão estilizado + pulso animado quando "falando").
- Layout com sidebar (desktop) + bottom-nav (mobile), ambos usando as rotas TanStack.

## Backend (Lovable Cloud)

Habilitar Cloud e criar migração com:

- `profiles` (id → auth.users, name, elevenlabs_voice_id, lev_tone, created_at)
- `projects` (id, user_id, nome, descricao, status enum, prioridade enum, progresso int, proximas_acoes jsonb, created_at, updated_at)
- `project_updates` (id, project_id, user_id, conteudo, ai_analysis, created_at)
- `briefings` (id, user_id, periodo enum manha|tarde|noite, data date, conteudo jsonb {agenda, projetos, redes, foco}, audio_url text nullable, created_at)
- `posts` (id, user_id, plataforma enum instagram|tiktok, status enum ideia|rascunho|aprovado|publicado, titulo, caption, hashtags text[], script, scheduled_at, created_at)
- `settings` (id, user_id unique, config jsonb) — persona LEV etc.

Cada tabela: RLS habilitado, GRANTs para `authenticated`, políticas escopadas em `auth.uid()`. Trigger para auto-criar `profiles` no signup.

Rotas server (TanStack, não Edge Functions):

- `src/routes/api/tts.ts` — POST → chama ElevenLabs com `ELEVENLABS_API_KEY` do env, retorna áudio MP3. Autenticado.
- `src/lib/ai.functions.ts` — `chatWithLev`, `generateBriefing`, `analyzeProject`, `generatePostContent` via AI Gateway.

## Fases de entrega

**Fase 1 — Fundação** (esta resposta)
Design system + emblema LEV + layout com sidebar/bottom-nav + rota `/auth` (login) + Cloud habilitada + migração de todas as tabelas + Dashboard (`/`) com saudação, data, orb pulsante, cards placeholder puxando dados reais quando existirem.

**Fase 2 — Chat + Voz**
Rota `/chat`: interface de conversa, `useChat` + rota server `/api/chat`, sistema prompt de LEV em pt-BR, botão de voz (mic Web Speech), botão speaker por resposta chamando `/api/tts`.

**Fase 3 — Projetos**
CRUD completo em `/projetos`, log de updates diárias, botão "Analisar com LEV" chamando `analyzeProject`.

**Fase 4 — Briefings**
Timeline em `/briefings`, gerador "Gerar briefing agora" (usa dados atuais de projetos/posts/agenda placeholder), play com TTS.

**Fase 5 — Redes Sociais**
`/redes`: calendar + kanban com drag-to-move, criação assistida por IA (caption/hashtags/script).

**Fase 6 — Configurações**
`/configuracoes`: chave ElevenLabs (via Secrets — apenas info + link), seleção de voz, tom de LEV, perfil.

## Detalhes técnicos

- Toda navegação: rotas separadas (`/`, `/chat`, `/projetos`, `/briefings`, `/redes`, `/configuracoes`, `/auth`) sob `_authenticated/` exceto `/auth` e a home pública que redireciona.
- `head()` por rota com título/description pt-BR.
- Server functions para todas as operações IA + Supabase escritas; RLS faz o resto.
- Mobile: sidebar vira drawer, cards empilham, bottom-nav com 5 ícones principais.
- Sem modo claro — LEV é escuro por design (tema único).

## Confirmação

Prossigo com a **Fase 1 completa** já nesta rodada (fundação visual + backend + dashboard funcional), e depois entrego as fases 2–6 conforme você aprovar cada uma? Ou prefere que eu entregue tudo de uma vez em uma única resposta gigante (mais lento, mais risco de erros)?