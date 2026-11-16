# AGENTS.md: Dilo (english-coach)

Free spoken English practice for work, for Spanish-speaking professionals. Next.js App Router, TypeScript, SQLite (`node:sqlite`), Vitest. Read `README.md` first, then `STATUS.md`.

## Rules
- UI text in English. Learners pick a level: beginner gets Spanish support (tips, translations), advanced is English only. Never use the em dash character.
- TDD: write the test first. Keep coverage at 80% or more (`npm run test:coverage`).
- Small files (200 to 400 lines, 800 max), immutable updates, explicit errors with friendly messages (`src/server/errors.ts`), validation at every boundary (zod).
- Keys never reach the browser. No secrets in code; `.env.example` holds names only.
- WCAG 2.1 AA, mobile first from 375px, Lucide icons (no emoji icons), `prefers-reduced-motion`.
- Conventional commits, no AI attribution lines.
- Never fake users, accounts or usage to move publik metrics.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## publik API
- Base URL: https://publikhq.com/api/v1 (OpenAI Chat Completions, Responses, Anthropic Messages)
- Models: publik-fast, publik-balanced, publik-smart only; never a vendor model name
- Sign in with publik: the publik module's gate runs at start-up, before the first screen; it also sends usage telemetry
- Key: per-install `pk_` from POST /installs, stored at the publik credential path; env PUBLIK_API_KEY / PUBLIK_API_BASE_URL override
- App token: publik-app-token.txt (public by design, committed) or PUBLIK_APP_TOKEN
- 402: show error.message + error.top_up_url only
- Show use: GET /wallet used_percent, never money
- Never print or log a key
- Docs: https://publikhq.com/llms.txt, https://publikhq.com/developers, https://publikhq.com/skills/api.md

### How this repo applies it (hosted web app)
- Module: `src/server/publik/publik.ts` (set `APP_SLUG` to the listing slug). Gate per browser session: `src/server/publik/gate.ts`. There is one module; do not add a second.
- The "credential path" here is the database: each browser session's `pk_` key is sealed with `APP_SECRET`. The app token is server only: `PUBLIK_APP_TOKEN` in the host's environment (not committed).
- The page shows the gate before the first screen (`src/components/coach-app.tsx`) and reports `app_opened` and `active_session` through `POST /api/telemetry`.
