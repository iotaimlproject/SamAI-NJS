# AGENTS.md — SamAI-Robotics

Next.js 16 + React 19 robot control HMI (mobile-only, 390px shell). Single page: `app/page.tsx` → `components/robot/RobotClient.tsx` (all client state lives there). No tests, no CI, no README.

## Commands (pnpm only — `packageManager: pnpm@10.32.1`, Node >= 20.9)

- `pnpm dev` — serves on port **5176** (`-H 0.0.0.0 -p 5176`), not 3000
- `pnpm typecheck` (`tsc --noEmit`) + `pnpm build` — the real verification
- `pnpm lint` is **broken**: no `eslint.config.*` exists at root, ESLint 9 exits with an error. Don't try to fix by guessing config; use typecheck + build instead
- `pnpm clean` — rimraf `.next out dist .turbo tsconfig.tsbuildinfo`
- No test runner. No `src/` dir despite `tailwind.config.ts` listing `./src/**` (harmless stale glob)

## Env (`.env` is currently empty — all voice/AI features degrade silently without keys)

Copy `.env.example` → `.env`. Server-only `DEEPGRAM_API_KEY` powers `/api/deepgram/token` (30s grant, falls back to raw key on 403) and `/api/deepgram/tts`. Without it: STT falls back to browser `SpeechRecognition`, TTS falls back to `speechSynthesis` — app still runs, just degraded. Restart `pnpm dev` after changing `.env`.

## Two gotchas that look like features but aren't wired up

- `NEXT_PUBLIC_NODE_RED_HOST` / `NEXT_PUBLIC_NODE_RED_PROTOCOL` (in `.env.example`) are **read nowhere**. `lib/nodeRedWebSocket.ts` hardcodes `wss://node-dev.iotaiml.dpdns.org`. To repoint the robot backend you must edit `NODE_RED_HOSTS` **and** the `connect-src` CSP in `next.config.mjs` (which also hardcodes the host + `api.deepgram.com`), or the browser will block the sockets.
- `node-red/` subdir is a **legacy reference project** (dashboard v1, OPC-UA, MySQL; its `flows.json` has zero websocket nodes). It is not the live backend and its paths don't match the frontend's. Don't edit it expecting frontend behavior to change; don't run its `package.json` scripts as part of web dev.

## Architecture notes

- Five WS channels, all via cached `SocketConnection` in `lib/nodeRedWebSocket.ts` (auto-reconnect with backoff, pending-queue of max 50, 150ms connect staggering): `/ws/robot`, `/ws/gripper`, `/ws/joints`, `/ws/speak`, `/ws/voice` (`NODE_RED_WS_PATHS`; use `getNodeRedSocket`/`sendNodeRedMessage`/`closeNodeRedSocket`, never raw `new WebSocket` for these).
- Voice loop: `hooks/useVoiceCapture.ts` → Deepgram STT (`nova-3`, `en-IN`, 16kHz linear16 via AudioWorklet in `lib/deepgram.ts`) → final transcript sent to `/ws/speak` with `{ device: "speak", ..., source: "dashboard" }` → Node-RED replies on `/ws/voice` → `lib/voiceService.ts:handleSpeakResponse` → TTS (`flux-priya-en`) via `/api/deepgram/tts` proxy. `source: "dashboard"` echoes are ignored on receive; STT is paused while speaking (`subscribeSpeaking`). Mic is blocked while `isSpeaking`.
- Path alias `@/*` maps to repo root (`./*`), i.e. `@/lib/...`, not `./src/*`.
- Styling: Tailwind v4 (`@import "tailwindcss"` in `app/globals.css`) + CSS vars; theme via `.light` class on `<html>` + `localStorage samai-theme` (dark default). Keep the single-column mobile layout; no desktop breakpoints.
