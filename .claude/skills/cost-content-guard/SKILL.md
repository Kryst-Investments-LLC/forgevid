---
name: cost-content-guard
description: Rules for forgevid changes that touch AI generation spend or user-generated/AI-generated content handling - generation endpoints, provider calls, retry logic, quotas, moderation, licensing/provenance. Invoke BEFORE editing those surfaces.
---

# Cost & content guard (forgevid)

AI video/image generation burns real money per call, and generated media
carries copyright/moderation exposure. Bugs here are billed, not just logged.

## Cost rules (any code path that calls a generation provider)
1. **Never verify with live provider calls.** Tests and local verification
   run against mocks/fixtures; a "quick real call to check" is spend, and a
   loop bug during verification is a bill.
2. Retry logic around generation calls needs a hard attempt cap and
   idempotency — a naive retry-on-timeout can multiply spend silently.
   State the worst-case call count of your change in the report.
3. Anything that changes WHEN generation triggers (queue logic, webhooks,
   user actions) must be checked for double-fire: same input → one
   generation. Quotas/rate limits are load-bearing; weakening one is a
   scope change, not a refactor.
4. New provider or model tier: record the per-call cost in the code comment
   at the call site — the next reader must see what a call costs.

## Content rules (upload, generation output, publishing surfaces)
1. Moderation hooks stay in the path: a change that lets user input reach
   generation, or output reach publishing, while skipping an existing
   moderation/validation step fails this guard.
2. Provenance: keep AI-generated media distinguishable where the system
   already marks it (metadata/watermark fields) — don't drop those fields
   in refactors.
3. Licensing of inputs (user uploads, stock/template assets) is not the
   implementer's judgment: uncertain reuse rights → escalate, and run the
   global `/research` skill for the licensing question first.

## Procedure
1. Map the change: does it touch provider calls, retries, quotas, triggers,
   moderation, or media metadata? If no — this guard doesn't apply.
2. Apply the rules; mock all provider calls in verification (verify-forgevid).
3. Report: worst-case call count, double-fire analysis, and which
   moderation/provenance steps the changed path passes through.
