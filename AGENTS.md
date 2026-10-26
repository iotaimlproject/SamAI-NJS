# AGENTS.md

## Project

Single-purpose Next.js 16 App Router (TSX) + shadcn/ui realtime **Performance Dashboard** (OEE / production) fed by Node-RED WebSockets, with Deepgram voice. It is the only page (`/`), behind a view-only login (`/login`). Code lives in `app/`, `components/`, `lib/`, `hooks/`, `proxy.ts`. No robot/home-dashboard code remains — don't reintroduce it.

## Commands

- Install: `pnpm install` (pnpm only — `packageManager: pnpm@10.32.1`; never npm)
- Dev: `pnpm dev` (`0.0.0.0:5175`) · Build: `pnpm build` · Prod: `pnpm start` (`:5175`)
- Verify: `pnpm typecheck`, `pnpm check` (asserts in `lib/auth/session.check.ts` and `lib/perfLayout.check.ts`), `pnpm build`
- `pnpm lint` currently crashes: `typescript-eslint` 8.x rejects TypeScript 7.0.
- Clean: `pnpm clean`

No test framework, no CI.

## Setup

`.env.local` (all server-only, see `.env.example`): `DEEPGRAM_API_KEY`, `SESSION_SECRET` (required in production, 16+ chars), `DASHBOARD_ACCESS_CODE` (required 6-digit shared view-only code, `123456` locally; login refuses while unset), `CCTV_STREAM_URL` (go2rtc player page, e.g. `https://host/stream.html?src=camera1&mode=webrtc,mse`; falls back to Node-RED `cctvUrl`).

- Node-RED host is hardcoded in `lib/nodeRedWebSocket.ts` (`wss://node-dev.iotaiml.dpdns.org`).
- CSP lives in `next.config.mjs`; `connect-src` must list any new `wss://`/`https://` host. `frame-src` adds the `CCTV_STREAM_URL` origin when the config loads, so rebuild (or restart dev) after changing it. `script-src 'unsafe-inline'` is needed by the pre-paint theme script in `app/layout.tsx`.

## Architecture

- `proxy.ts` — optimistic auth gate: no valid `samai_session` cookie → redirect to `/login?next=…` (pages) or `401` (`/api/*`, incl. the Deepgram token/TTS routes).
- `lib/auth/session.ts` — HMAC-SHA256 signed `{ role: "viewer", expiresAt }` token via Web Crypto (works in proxy and server actions). `app/login/actions.ts` — `login` (6-digit code, constant-time compare, 5 failures → 5 min lockout, in-memory per instance) / `logout`.
- `app/login/` — code-only login (`InputOTP`, masked with reveal toggle, auto-submit, shake on error). `components/theme-toggle.tsx` is shared by login and header and switches theme with a View Transition that spreads as a soft-edged circle from the button (`theme-flow` in `globals.css`). `components/logo.tsx` is the SAM AI mark (black tile, white hexagon + isometric S); `public/favicon.svg`/`.ico`/`apple-touch-icon.png` are the same mark in fixed colors.
- `app/page.tsx` — renders `app/components/perf/PerfDashboardClient.tsx` (`'use client'`).
- `app/components/perf/` — panels: `PerfHeader`, `PerfLiveBatch`, `PerfOeeOverview` (`PerfGauge` arcs with 0–50 red / 50–70 amber / 70–100 green zone band + machine/production LED `Item`s + progress), `PerfMetricList` (scrollable OEE/Energy tiles), `PerfProductionCharts` (fixed-height bar charts), `PerfAiPanel`, `PerfMessagesAlerts`, `PerfDataPanel` (filter, CSV export, table), `PerfVoiceOrb` (draggable, transcript/thinking/reply callout), `PerfCctvWindow` (draggable/resizable go2rtc iframe window, mounted only while open). Shared bits in `perfUi.tsx` (`PANEL`, `PanelHeading`, `MetricTile`, tones, `TAB_*`, formatters).
- Hooks: `usePerfDashboardSocket` (`/ws/dashboard`, `sendCommand`), `useMachineLeds` (`/ws/machine` + `/ws/stop`), `usePerfDataFeed` (`/ws/data`), `usePerfVoice` (wraps `useVoiceCapture` + `/ws/speak` + `/ws/voice`, phases `idle|listening|thinking|speaking`).
- `lib/perfTypes.ts` — `DashboardData` + `EMPTY_DASHBOARD`; `lib/perfTelemetry.ts` — telemetry fallback patch.
- `lib/deepgram.ts` (STT `nova-3`/`en-IN`, TTS, half-duplex speaking lock), `lib/voiceService.ts`, `hooks/useVoiceCapture.ts` (browser `SpeechRecognition` fallback; token fetched only once the mic is enabled).
- Path alias `@/*` → `./*`.

## Layout rules

- Desktop (`xl`+): the page is one screen, `h-[max(100dvh,48rem)]`, and every panel is resizable via shadcn `Resizable` (react-resizable-panels v4) nested groups: `group-root` (dashboard / data table) → `group-columns` (left / right) → `group-left` (Live Batch / OEE Data) and `group-right` (OEE arcs / middle / alerts) → `group-middle` (charts / AI). Default sizes are rem-based so they scale; double-click a handle to reset that split; the header `LayoutDashboard` button resets everything. Only user-initiated changes are saved (`meta.isUserInteraction`) to the `samai_layout` cookie via `lib/perfLayout.ts` (`DashboardLayout`); `app/page.tsx` reads it server-side so saved layouts render without a jump. Panels and groups get `style={{ overflow: "visible" }}` so card rings and hover shadows are not clipped; cards are `h-full` and scroll internally.
- Below `xl` the root div flattens every group/panel with `max-xl:[&_[data-group]]:contents!` (and the same for `[data-panel]`, `[data-panel]>div`), hides separators, and cards stack by `order-*`.
- Charts: one bar per series (Current / Predicted / Target) with X/Y axes only, no legend; the title row shows `Δ predicted − current`. AI Simulation sits in the panel heading; confidence lives only in the AI panel.
- Machine/Production status uses `components/ui/led.tsx` (`Led`: glowing green/red, dim when off, pulses while running).
- High resolution: `html` font-size is `max(16px, min(0.8333vw, 1.4815dvh))` (16px at 1920×1080, 21.3px at 2560×1440, 32px at 4K), so the whole UI scales proportionally. Use rem sizes (`text-[0.625rem]`, not `text-[10px]`); Recharts sizes read the root font size. Lightning CSS drops `min(100vw / 120, …)`, so keep the precomputed `vw`/`dvh` form.
- Below `xl`: stack order is Live Batch → OEE arcs → charts → AI → OEE Data → alerts → data table; charts are fixed `h-40`. The header is a 2-row grid below `xl` (row 1: logo + title + bell/theme/connection/logout; row 2: machine select + Production Data/CCTV), labels and the connection badge collapse to icons below `sm`, and it becomes one 3-column row at `xl`.
- Motion: `PANEL` fades in and lifts on hover, tiles, gauges and buttons have hover lift/scale, values pop on change (`VALUE_POP`), shadcn `Tooltip` on icon buttons and chart info. Custom keyframes (`shake`, `shimmer`, `drift`, `caret-blink`) live in `globals.css`. A global `prefers-reduced-motion` guard disables all of it.

## Styling

shadcn `radix-nova` preset, Tailwind v4, no `tailwind.config`. `app/globals.css` holds the only tokens: light on `:root`, dark on `.dark` (`localStorage["samai-theme"]`). Dark is high-contrast: true-black `--background`, cards at `oklch(0.155)`, near-white text, 12% white borders. Extra tokens: `success`, `warning`, `chart-current|predicted|target`, `gauge-performance`. Recharts/SVG take `var(--…)` directly. Add primitives with `pnpm dlx shadcn@latest add <name>`, then fix any `from "cn"` import to `@/lib/utils`.

## Data protocol

- `/ws/dashboard`: `dashboard:data` (full, merged over `EMPTY_DASHBOARD`) → `dashboard:update` (partial merge) → `extractTelemetryPatch` fallback. On open the client sends `dashboard:request` / `initial-data`.
- Commands: `{ type: "dashboard:command", command: "load-all" | "start" | "stop" | "reset" | "set-speed" | "select-machine" | "acknowledge-alerts", payload? }`.
- Zero-default rule: every `DashboardData` field has a `0`/`""`/`[]` default; add new fields to both the interface and `EMPTY_DASHBOARD`, and render `--` for empty strings (`orDash`).
- `machine` payload: `value: { power, led, production }` — independent states.

## WebSocket rules

- Never `new WebSocket` / `socket.send` for Node-RED directly. Use `getNodeRedSocket(path, handlers)`, `sendNodeRedMessage(path, payload)`, `closeNodeRedSocket(path)` with `NODE_RED_WS_PATHS` keys: `dashboard`, `data`, `machine`, `stop`, `speak`, `voice`.
- Client socket/voice code is `'use client'`; always `closeNodeRedSocket(path)` in `useEffect` cleanup.
- `lib/nodeRedWebSocket.ts`: cached connection per path, 150ms connect staggering, 8s connect timeout, backoff `1s * 1.5^n` capped 30s, bounded 50-message queue.

## Git / variants

One folder per variant; each folder's active branch tracks its own origin branch:

- `E:\Projects\SamAI` → `SamAI-React`, branch `main`
- `E:\Projects\SamAI-Perf` (this repo) → `SamAI-NJS`, branch `perf-dashboard`
- `E:\Projects\SamAI-Robotics` → `SamAI-NJS`, branch `robotics`

Do not mix branches across folders or push one variant's history to another variant's remote/branch.
