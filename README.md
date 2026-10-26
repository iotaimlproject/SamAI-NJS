# SamAI Performance Dashboard

Realtime OEE / production dashboard driven by Node-RED over WebSockets, with Deepgram voice control.
Next.js 16 (App Router) · React 19 · shadcn/ui (Tailwind v4) · Recharts.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill DEEPGRAM_API_KEY, SESSION_SECRET, CCTV_STREAM_URL; access code defaults to 123456
pnpm dev                     # http://localhost:5175
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on `0.0.0.0:5175` |
| `pnpm build` / `pnpm start` | Production build / server on `:5175` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm check` | Session-token self-check |

## Access

`/login` takes a single 6-digit access code (`DASHBOARD_ACCESS_CODE`, no user accounts) and issues a signed, HttpOnly view-only session cookie (12 h).
`proxy.ts` redirects every page to `/login` without it and returns `401` for `/api/*`. Five wrong codes lock a client out for 5 minutes (in-memory, per instance). `SESSION_SECRET` must be set in production.

## Node-RED channels

Host is fixed in `lib/nodeRedWebSocket.ts` (`wss://node-dev.iotaiml.dpdns.org`).

| Path | Direction | Payload |
| --- | --- | --- |
| `/ws/dashboard` | both | `dashboard:data` (full) / `dashboard:update` (partial) with `DashboardData` fields from `lib/perfTypes.ts`; UI sends `dashboard:command` (`load-all`, `set-speed`, `select-machine`, `acknowledge-alerts`) |
| `/ws/data` | in | `{ device: "data", value: { batchPartNo, activePartNo } }` |
| `/ws/machine` | in | `{ device: "machine", value: { power, led, production } }` |
| `/ws/stop` | in | `{ device: "stop", value: boolean }` |
| `/ws/speak` | out | voice transcript `{ device: "speak", value, source: "dashboard" }` |
| `/ws/voice` | in | text for SAM AI to speak |

Every `DashboardData` field defaults to `0` / `""` / `[]`, so Node-RED can send any subset.

## CCTV

The header CCTV button opens a draggable, resizable window that embeds a [go2rtc](https://github.com/AlexxIT/go2rtc) player page from `CCTV_STREAM_URL` (e.g. `https://cctv.example.com/stream.html?src=camera1&mode=webrtc,mse`). Its origin is added to the CSP `frame-src` when the Next config loads, so rebuild after changing it. Use an https go2rtc URL when the dashboard is served over https.

## Voice

Mic → Deepgram STT (browser `SpeechRecognition` fallback) → `/ws/speak` → Node-RED → `/ws/voice` → Deepgram TTS → speaker.
The draggable SAM AI orb shows the live transcript, a thinking state, and the reply.
