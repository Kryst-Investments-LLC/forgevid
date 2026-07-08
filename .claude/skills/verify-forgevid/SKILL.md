---
name: verify-forgevid
description: Staged verification for forgevid - validate gate (type-check, lint, Jest), integration suite, then real boot with /api/health smoke. Use before claiming any nontrivial change works or before committing.
---

# Verify forgevid

Run stages in order; stop at first FAIL, report output verbatim, fix,
re-run. Never report a stage passed without seeing its output this session.

## Stage 1 — validate gate (always)
```
npm run validate
```
= type-check + lint + jest. This is the minimum "done" bar for any edit.

## Stage 2 — integration (API/route/db changes)
```
npm run test:integration
```
Jest against `__tests__/api`. Prisma touched? `npm run db:generate` and
apply the migration first.

## Stage 3 — real boot smoke (server.js, config, middleware, or db changes)
1. Services up: `docker compose up -d`
2. Migrate if needed: `npm run db:migrate`
3. Boot the REAL server: `npm run dev` (custom `node server.js` — this is
   the production-shaped path, don't substitute `next dev`)
4. Smoke: `npm run monitor:health` (expect 200 from /api/health) + one
   happy-path request against the changed route
5. Collaboration features touched? Also boot `npm run collaboration:dev`
   (or `:memory` without Redis) and exercise one round-trip.
6. Kill the servers when done.

## Stage 4 — e2e (user-flow changes, pre-PR)
```
npm run test:e2e
```

## Report
| Stage | Command | Result |
|---|---|---|
| validate | npm run validate | PASS/FAIL |
| integration | npm run test:integration | PASS/FAIL/N-A |
| boot smoke | dev + monitor:health | PASS/FAIL/N-A |
| e2e | npm run test:e2e | PASS/FAIL/N-A |

N-A needs a stated reason. FAIL anywhere = not done.
