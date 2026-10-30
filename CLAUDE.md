# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Notes for Claude

- Stack: Next 16.3 (`proxy.ts`, not `middleware.ts`), React 19.2, Tailwind 4, TypeScript 7, recharts 2.15, shadcn `radix-nova`.
- Browser checks with Playwright: `routeWebSocket` doesn't intercept the Node-RED sockets here. To render with data, stub `window.WebSocket` via `page.addInitScript` for `/ws/` URLs only and pass everything else to the real `WebSocket` (faking Next's dev HMR socket stops hydration silently). On `/ws/perf/live` emit `{ type: "snapshot", messages: [{ topic: "perf/CNC-01/oee", payload: { availability: 92 } }, { topic: "perf/CNC-01/machine", payload: { power: true, led: true, production: true } }] }` (or single `{ topic, payload }` frames). Sign in at `/login` with the code from `.env.local` (`123456`). The Playwright window is visible on the desktop, so the real cursor can inject stray pointer events into drag tests.
- Run a single check/test file directly: `node --no-warnings lib/perfLayout.check.ts` or `node --no-warnings --test lib/perfTelemetry.test.ts` (Node strips the TS types; strip-only mode rejects parameter properties/enums). Measure socket timing on a production build: dev StrictMode double-mounts every effect.
- Node-RED: the `node-red` MCP edits flows; only touch the **NextJS Perf** tab (`64c74ba883b466d0`) unless asked. Back it up first (`curl …/flow/<id>`), and check other tabs are unchanged afterwards by diffing `GET /flows`.
- After deleting routes, clear `.next/types` if `pnpm typecheck` reports missing `app/**/page.js` modules.
- `.playwright-mcp/` is local tooling output, not source.
