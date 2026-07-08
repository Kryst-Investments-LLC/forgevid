---
name: debug-forgevid
description: Debugging playbook for forgevid - reproduce first, mind the custom server and collaboration process, root-cause before fixing. Use when investigating a bug, failing test, or unexpected behavior.
---

# Debugging playbook — forgevid

## 1. Reproduce before touching anything
- Failing test: `npx jest <path> --verbose`. API tests live in
  `__tests__/api` and may need services: `docker compose up -d`.
- Runtime bug: boot the REAL server (`npm run dev` = `node server.js`) and
  hit the endpoint yourself; check `npm run monitor:health` first — a dead
  dependency (Postgres/Redis) masquerades as an app bug.
- Real-time/collab bug: remember it's a separate process
  (`collaboration:dev`); if Redis isn't running, `collaboration:dev:memory`.
- Can't reproduce = you don't understand it yet; gather evidence, don't "fix".

## 2. Root cause, not symptom
- Trace the actual path (server.js → route → lib → Prisma) by reading the
  code; don't guess from the error message. server.js sits OUTSIDE Next's
  conventions — routing/middleware surprises often originate there.
- `git log --oneline -10 -- <path>` — a recent change is the usual culprit.
- Prisma type errors: stale client — `npm run db:generate` before assuming
  a code bug.
- "Change not taking effect": server.js and config aren't hot-reloaded —
  restart the dev server before debugging further.

## 3. Prove the fix
- Re-run the exact reproduction, then `npm run validate`; boot-affecting
  fixes also re-run the verify-forgevid boot-smoke stage.
- Intermittent/flaky (common around websockets/collab): 5 clean runs
  minimum before claiming fixed — one clean run proves nothing.

## 4. Report
Root cause (one sentence), fix, evidence (commands + output). If you only
mitigated the symptom, say so explicitly.
