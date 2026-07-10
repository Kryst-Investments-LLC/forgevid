# CLAUDE.md — forgevid

AI video platform: a prompt (or a product URL, or an estate agent's photos) →
script → footage → narration → ffmpeg render. Next.js 14 App Router on a custom
Node server, Prisma (PostgreSQL), BullMQ (Redis-optional), fluent-ffmpeg.

## Commands

```bash
npm run dev              # custom server: node server.js (NOT next dev)
npm run type-check       # NEVER `npx tsc` — it resolves an unrelated binary

# the real safety net: runtime suites, not mocks
npm run verify:generate  # the renderer, ~240 assertions against real ffmpeg
npm run verify:site      # URL ingestion + SSRF guards, real sockets
npm run verify:proxy     # the headless browser's egress proxy
npm run verify:export    # timeline export
npm run verify:e2e:db    # throwaway Postgres on a RANDOM free port
npm run verify:providers # LIVE OpenAI/ElevenLabs/Pexels/HeyGen (costs money)
npm run build            # must pass with EVERY provider key unset

npm run db:local         # persistent dev Postgres on 127.0.0.1:54329
npm run music:beds       # regenerate the license-free background beds
```

## Rules

- **A change is done only when a verification command passes in the same
  session.** Report failures verbatim; never soften them. See the
  `verify-forgevid` skill for the staged gate.
- **Drive the real browser** for any UI, middleware, `server.js` or
  `next.config` change. Playwright is installed. Three bugs shipped through a
  fully green suite because curl exercises the API and never the browser: client
  fetches with no CSRF header, a CSP that blocked React's own bootstrap, and a
  rate limiter that 429'd its own `/_next` chunks.
- Small commits, one logical unit each, `type(scope): description`.
- `npm run dev` is `node server.js`, not `next dev`. Changes to `server.js`,
  `middleware.ts` or `next.config.mjs` need a restart.
- **The BullMQ worker (`npm run worker`) does NOT hot-reload.** After any change
  to `lib/` it keeps running the code it booted with — a render can silently use
  a stale pipeline (a campaign's pinned scenes were ignored because the worker
  predated the feature). Restart the worker on lib changes, same as the server.
- Prisma schema edits: `npm run db:generate` plus a migration in the same commit.
- Update `TODO.md`'s progress log rather than creating new summary files. Note
  that anchored text edits **fail silently when the anchor has moved** — check
  the file afterwards.

## Non-negotiables

- **Fail visibly.** No placeholder videos, no invented transcripts, no fabricated
  voice ids. A missing key returns 503; it never fakes output.
- **The renderer never takes a URL from a client.** Resolve `MediaAsset` by id
  and check ownership. Every user-supplied URL goes through `lib/safe-fetch.ts`,
  whose guard validates the IP *inside the socket's own lookup hook* — so DNS
  rebinding has no window to exploit.
- **Plan gates resolve server-side** from the video's OWNER (watermark, 4K,
  branding, avatars, voice cloning). Never from client input.
- **Everything reaching a filtergraph is escaped; colours are hex-validated.**
- **Never invent a fact in generated copy.** The scriptwriter sees only what was
  extracted, is told not to fabricate, and its output is Zod-validated. Estate
  agents are legally accountable for what their listings claim.
- **Delete only what you created.** "Clean up my temp files" is not "empty the
  directory": the suite once `rmSync`'d `public/generated` recursively and
  deleted every video a user had made.

## Traps this codebase has actually sprung

- **`npx tsc` runs the wrong binary.** Use `npm run type-check`, check the exit
  code, don't grep the output.
- **Escape sequences do not survive a bash heredoc.** `'\n'` written through
  `python - <<'PY'` lands as a literal newline and breaks the string. `scripts/`
  is outside the app tsconfig, so type-check won't catch it — esbuild will, at
  run time. Write test files with the editor. (This has bitten three times.)
- **fluent-ffmpeg splits an `outputOptions` entry containing exactly one space.**
  Use `.videoFilters()` / `.complexFilter()`.
- **`ffmpeg-static` must stay in webpack externals**, or the app silently falls
  back to a 2018 ffmpeg with no `xfade` and loses every cross-fade while the
  tests still pass.
- **A scene's `description`, `narration` and `searchQuery` are three different
  things.** Conflating them made a voiceover read its stage directions aloud and
  a stock search return a lipstick advert. See the `render-pipeline` skill.
- **Measure the stem, not the mix.** The music "ducking" was verified for months
  and never ducked: the assertion read total loudness, where the voice masked the
  music.
- **Whisper rejects audio over 25 MB**; our narration upload allows 50 MB.
  `compressForWhisper()` handles it.

## Layout

- `lib/video-generator.ts` — `planScenes` → `resolveSceneClips` → `assembleVideo`
- `lib/safe-fetch.ts`, `lib/guarded-proxy.ts` — the SSRF boundary
- `lib/product-loop.ts`, `lib/clip-memory.ts` — what the platform remembers
- `lib/listing-brief.ts`, `lib/mls-feed.ts` — the real-estate vertical
- `scripts/verify-*.ts` — the suites. Add to them; they are the safety net.

## Claude Code setup (`.claude/`)

- `agents/implementer.md` — Sonnet-routed executor: delegate specced
  implementation tasks; keep planning and review in the main session.
- `skills/verify-forgevid` — the staged verification gate.
- `skills/render-pipeline` — the renderer's contracts and ffmpeg footguns. Read
  before touching anything that emits a filtergraph.
- `skills/debug-forgevid` — reproduce-first debugging playbook.
- `skills/cost-content-guard` — provider spend and content safety.
