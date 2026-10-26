# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Notes for Claude

- Stack: Next 16.3 (`proxy.ts`, not `middleware.ts`), React 19.2, Tailwind 4, TypeScript 7, recharts 2.15, shadcn `radix-nova`.
- Browser checks with Playwright: `routeWebSocket` doesn't intercept the Node-RED sockets here. To render with data, stub `window.WebSocket` via `page.addInitScript` for `/ws/` URLs only and pass everything else to the real `WebSocket` (faking Next's dev HMR socket stops hydration silently). Emit `{ type: "dashboard:data", payload }` on `/ws/dashboard` and `{ device: "machine", value: { power, led, production } }` on `/ws/machine`. Sign in at `/login` with the code from `.env.local` (`123456`). The Playwright window is visible on the desktop, so the real cursor can inject stray pointer events into drag tests.
- Run a single check file directly: `node --no-warnings lib/perfLayout.check.ts` (Node strips the TS types; no test runner).
- After deleting routes, clear `.next/types` if `pnpm typecheck` reports missing `app/**/page.js` modules.
- `.playwright-mcp/` is local tooling output, not source.
