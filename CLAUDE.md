# CLAUDE.md — forgevid

AI video/image pipeline platform. Next.js + custom Node server, Prisma
(PostgreSQL), Jest + Playwright, npm.

## Commands
```bash
npm run dev              # custom server: node server.js (NOT next dev)
npm run dev:full         # dev + collaboration server (separate process)
npm run validate         # type-check + lint + test — the per-change gate
npm run test:unit        # jest __tests__ (with coverage)
npm run test:integration # jest __tests__/api
npm run test:e2e         # playwright
npm run db:migrate       # prisma migrate dev; db:generate after schema edits
npm run monitor:health   # curl localhost:3000/api/health
docker compose up -d     # local services (docker:dev)
```

## Rules
- A change is done only when `npm run validate` passes in the same session.
  Report failures verbatim.
- Small commits, one logical unit each, `type(scope): description`.
- The dev server is `node server.js`, not `next dev` — server.js changes
  need a restart and are outside Next's hot reload.
- The collaboration server is a separate process (`collaboration:dev`;
  `collaboration:dev:memory` to run without Redis).
- Prisma schema edits: `npm run db:generate` + a migration in the same commit.

## Claude Code setup (.claude/)
- `agents/implementer.md` — Sonnet-routed executor: delegate specced
  implementation tasks to it; keep planning/review in the main session.
- `skills/verify-forgevid` — staged verification gate (validate →
  integration → real-boot smoke via /api/health → e2e).
- `skills/debug-forgevid` — reproduce-first debugging playbook.
