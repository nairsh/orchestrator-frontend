# orchestrator-frontend

Web UI for [plexus](https://github.com/nairsh/plexus) — a browser client for
starting workflows, watching them execute, and inspecting what each sub-agent
did.

The server does the orchestration; this is a thin client over its HTTP API. It
streams workflow events over SSE, so task state, tool calls, and agent output
appear as they happen rather than on completion.

## What's here

- Workflow list and detail views, with the per-step execution trace
- Live event streaming over SSE (`src/api/sse.ts`)
- Chat surface for single-shot requests against the model router
- Approval gate for tool calls that require confirmation
- Connectors, schedules, teams, templates, and memory management
- Billing and agent-health panels

React 19 + TypeScript + Vite + Tailwind. Roughly 90 source files.

## Running it

```bash
npm install
npm run dev
```

Point it at a running plexus instance from the in-app settings — the API base
URL is stored per browser, not baked into the build.

Clerk is optional. Set `VITE_CLERK_PUBLISHABLE_KEY` to enable hosted auth; without
it the app runs unauthenticated, which is only appropriate against a local
server.

```bash
npm run build      # tsc, then vite build
npm run preview
```

## Status

Experimental, and developed alongside plexus rather than as a standalone
product. With Clerk configured the whole app sits behind a sign-in gate;
without it there is none, so run it that way only against a local server.
Authorization is the server's responsibility either way — the client renders
whatever the API returns it. The production bundle is not code-split and the
main chunk is large.

MIT licensed.
