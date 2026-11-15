# Dilo: practice your work English out loud, free

> "Practice your job interview in English, out loud, free."

Dilo (working name, Spanish for "say it") is a free daily speaking practice for Spanish-speaking professionals who work or job-hunt in English. It is the free version of Speak ($39.99/mo), Praktika and Cambly, focused on work.

1. Pick a scenario: job interview, team meeting, client call, presentation or salary negotiation.
2. Pick your industry: general, sales, customer support, healthcare admin, construction or tech.
3. Talk out loud with an AI counterpart for 5 to 10 minutes (push to talk, or type if you have no mic).
4. Get feedback: what you did well, 3 phrases to say more naturally (with the better version), vocabulary to keep, and a score.
5. Come back tomorrow: daily streak, session history and a "phrases to review" list.

The interface is in Spanish (neutral Latin American). The conversation is in English.

## Run it locally

Requirements: Node.js 22.13 or newer (it uses the built-in `node:sqlite`), npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables the app runs in **demo mode**: the AI is a deterministic mock, the counterpart speaks with your browser's English voice, and the whole flow (practice, feedback, streak, phrases, history) works offline. A small "Modo demo: IA simulada" chip says so on the home screen.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Run the test suite (Vitest) |
| `npm run test:coverage` | Tests plus coverage report (thresholds: 80% lines, branches, functions, statements) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Production build and server |

To use the real AI, copy `.env.example` to `.env.local` and follow [PUBLIK-SETUP.md](PUBLIK-SETUP.md). Never commit real values.

## Architecture

```
Browser (Next.js client components)            Server (Next.js route handlers, Node runtime)
-----------------------------------            ----------------------------------------------
MediaRecorder (push to talk)  --audio-->  POST /api/practice/:id/turn
                                             1. /audio/transcriptions (whisper-1)
                                             2. /chat/completions (publik-balanced) as the counterpart
                                             3. /audio/speech for the reply audio
Audio element or speechSynthesis  <--base64 mp3 or null (browser voice fallback)
                                          POST /api/practice/:id/finish
                                             /chat/completions (publik-balanced, retry on publik-fast) -> JSON feedback
                                          GET  /api/progress  (streak, last 7 days, history, phrases)
                                          GET/POST /api/gate  (Sign in with publik)
                                          POST /api/telemetry (app_opened, active_session)
```

Layers (each file is small and has its own tests):

| Folder | Role |
|---|---|
| `src/domain/` | Pure logic: scenarios and industries, prompts, conversation rules, feedback parsing (zod), streak math |
| `src/server/ai/` | The AI port (`AiProvider`), an OpenAI-compatible client used for publik API and for a user's own key, and the offline mock |
| `src/server/publik/` | `publik.ts` (installs, wallet, gate words, telemetry; adapted from publik's reference module) and `gate.ts` (Sign in with publik per browser session) |
| `src/server/db/` | The `Store` interface and its SQLite implementation |
| `src/server/` | Config (validated env), errors with friendly Spanish messages, sealed keys (AES-256-GCM), session cookie, rate limit, use cases (`practice-service.ts`) |
| `src/app/api/` | Thin route handlers |
| `src/components/`, `src/lib/` | UI, typed API client, browser hooks (recorder, speaker, gate polling, telemetry) |

### Key decisions

- **Every key stays on the server.** The browser only holds a random session id in an HttpOnly cookie. publik install keys (`pk_`) and a user's own OpenAI key are stored sealed with AES-256-GCM (`APP_SECRET`) and never sent to the browser.
- **AI behind an interface.** Tests and local demo use the mock provider; the real publik client is chosen by config (`AI_PROVIDER=publik`). Model tiers only (`publik-fast`, `publik-balanced`), never vendor model names, for publik.
- **Sign in with publik for a hosted web app.** publik's TypeScript module keeps one install per computer in a file. A hosted app serves many people, so `gate.ts` gives each browser session its own install (`POST /api/v1/installs`), shows the same gate screens with publik's exact words, and sends `app_opened` and `active_session` with that install's key. This adaptation is documented as an open question for publik in [STATUS.md](STATUS.md).
- **Push to talk, turn based** (v1). Simple, works on every phone browser, and each turn is a clear unit to transcribe, answer and speak. If the reply audio fails or the browser blocks autoplay, the browser's own English voice reads it, and every counterpart bubble has an "Escuchar" button.
- **Errors** are mapped once (`src/server/errors.ts`) to friendly Spanish messages. A 402 from publik shows its message and exactly one link (the top-up URL), as publik asks.

### Why SQLite (`node:sqlite`)

- Zero services and zero cost: one file, built into Node 22.13+, no native module to compile.
- Real transactions and indexes for the few tables this app needs (users, practices, phrases).
- Survives restarts, unlike in-memory state, and is easy to back up (copy one file).
- The app depends on the `Store` interface, so moving to a hosted database (for example libSQL/Turso or Postgres) means one new file, not a rewrite.

Trade-off: it needs a server with a persistent disk (a container with a volume or a small VM). Serverless hosts without a disk would lose the data. See the deploy notes in [PUBLIK-SETUP.md](PUBLIK-SETUP.md).

### Voice: v1 now, realtime as v2

v1 is push to talk: record, send, transcribe (whisper-1, files up to about 4 MB, so recordings stop at 90 seconds), reply, speak.

v2 (documented, not built): publik's realtime voice over `wss://realtime.publikhq.com/v1/realtime` (OpenAI Realtime events, Gemini Live, 16-bit mono PCM at 24 kHz). publik's docs say a browser cannot set the Authorization header and must send the key in a subprotocol, "only with a key that belongs to the person at the browser". To keep keys on the server, v2 should relay the socket through our server (browser to our WebSocket, our server to publik with the install key in the header). publik lists the price at about $0.0225 per minute where both sides talk, and a session holds $0.225 of balance when it opens.

## Accessibility and design

WCAG 2.1 AA target: color tokens checked for 4.5:1 contrast in light and dark mode, visible focus rings, labels on every field, a skip link, one `h1` per screen, `lang="en"` on English text, icons from Lucide (no emoji icons), 44px+ touch targets, `aria-live` announcements during the conversation, space bar to talk, Escape to cancel, and `prefers-reduced-motion` respected. Mobile first from 375px.

## Privacy

Audio is sent for transcription and not stored. Transcripts, feedback and phrases are stored per browser session in the app's database so streaks and history work. publik routes AI requests to its providers (see `ai_providers` on publik's `GET /wallet`).

## License

MIT. See [LICENSE](LICENSE).
