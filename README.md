# SamAI Robot HMI

Mobile-only (390px) robot control panel. Next.js 16 + React 19, single page (`app/page.tsx` → `components/robot/RobotClient.tsx`, all client state lives there).

Panels: **Robot** power switch (capsule fill = `robotled`, knob position = `robotstatus`, OFF = black) · **Status** (6 fields) · **Joint Display** (6-axis J1–J6 + XYZ/Roll/Pitch/Yaw) · **Position Controls** (presets, speed, single-axis move) · **Programme ID** (scrollable roller reel + Execute) · **Voice** command dock (mic → STT → Node-RED → TTS reply).

## Setup

Requires pnpm 10.32.1, Node ≥ 20.9. No tests, no CI.

```bash
cp .env.example .env   # then edit (see below)
pnpm install
pnpm dev                # serves on :5176 (not 3000)
```

`.env`:

```bash
NEXT_PUBLIC_NODE_RED_HOST=localhost:1880   # Node-RED host (no protocol, no path)
NEXT_PUBLIC_NODE_RED_PROTOCOL=ws           # ws | wss
DEEPGRAM_API_KEY=...                       # optional — voice degrades without it
```

> Restart `pnpm dev` after any `.env` change (`NEXT_PUBLIC_*` is baked in at start). Verify with `pnpm typecheck` + `pnpm build` (`pnpm lint` is broken — no eslint config at root). Testing from a phone? Use your PC's LAN IP in `.env`, not `localhost`.

### Backend (Node-RED, :1880)

```bash
cd node-red
node-red -u . -s settings.cjs
```

Serves the editor + the 7 `/ws/*` endpoints from the **NextJS** flow tab. The app's `NEXT_PUBLIC_NODE_RED_HOST` must point at this host:port.

### Coming from npm?

```bash
npm i -g pnpm        # or: corepack enable (then `corepack use pnpm@10.32.1`)
```

| npm | pnpm (use this) |
|-----|-----------------|
| `npm install` | `pnpm install` |
| `npm run dev` | `pnpm dev` |
| `npm run build` | `pnpm build` |

This repo pins `packageManager: pnpm@10.32.1` — stick to pnpm so the lockfile stays valid.

## Architecture

```text
Phone UI (:5176)  ←7 websockets→  Node-RED (:1880, "NextJS" tab)  →  robot
Voice loop: mic → Deepgram STT (nova-3) → /ws/voice {text}
            → Node-RED → /ws/speak {text} → TTS (flux-priya-en)
```

- All sockets go through the cached `SocketConnection` in `lib/nodeRedWebSocket.ts` (auto-reconnect, one socket per path). Never use raw `new WebSocket` for these paths.
- Backend host comes from env with fallback to the old `wss://node-dev…` host; the CSP `connect-src` in `next.config.mjs` must allow the same host or the browser blocks the sockets.
- `node-red/` subdir is a legacy reference project, not the live backend. Its `flows_cred.json` is git-ignored (encrypted secrets blob).

## Websocket contract

No `device`/`source` keys. Out-shape matches in-shape per channel.

| Path | Direction | Payload |
|------|-----------|---------|
| `/ws/robot` | app → NR | `{ robotstatus: boolean }` |
| `/ws/robot` | NR → app | `{ robotstatus: boolean }` and/or `{ robotled: boolean }` (per-key, single or both) |
| `/ws/velocity` | app → NR | `{ velocity: "fast" \| "slow" }` |
| `/ws/status` | NR → app | `{ message, status, connection, command, activeJoint, armState }` (strings; `activeJoint` `"J1"`–`"J6"`/`"NONE"`, bare number `n` also accepted → `J{n+1}`) |
| `/ws/joints` | both ways | full `{ joint1…joint6: number }`, degrees 0–360 |
| `/ws/preset` | app → NR | `{ preset: "home" \| "retreat" \| "a" \| "b" }` or `{ program: "packing" \| "labelling" \| "riveting" \| "cutting" }` |
| `/ws/speak` | NR → app | `{ text: string }` (reply → transcript box + TTS) |
| `/ws/voice` | app → NR | `{ text: string }` (transcript) |

Robot + joints are duplex (one shared socket each); the rest are single-direction. No ws-in chain may touch any ws-out on the Node-RED side.

## FAQ

**Status shows DISCONNECTED?** 1) Node-RED running on the host:port in `.env`? 2) Did you restart `pnpm dev` after editing `.env`? 3) Does `next.config.mjs` `connect-src` allow that host? 4) Hard-refresh (`Ctrl+Shift+R`) — stale CSS/JS is the usual suspect.

**Mic tap does nothing?** Allow microphone permission (lock icon in address bar), then tap again. Without a mic or key, the box says why.

**No `DEEPGRAM_API_KEY`?** App still runs: STT falls back to browser `SpeechRecognition`, TTS to `speechSynthesis`. Quota/quality will differ.

**Joints show `–` for pose?** Backend sends only joint angles; X/Y/Z/Roll/Pitch/Yaw stay dashed until Node-RED emits `pose`.

**Buttons look broken/stacked?** Stale stylesheet — hard-refresh. Layout-critical styles live inline in the components, so structure survives caching; theming needs the fresh CSS.
