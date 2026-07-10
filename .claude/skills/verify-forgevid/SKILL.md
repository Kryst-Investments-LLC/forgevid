---
name: verify-forgevid
description: Staged verification for forgevid - type-check, the verify:* runtime suites (real ffmpeg, real sockets, a throwaway Postgres), a production build with no keys, and driving the real browser with Playwright. Use before claiming any nontrivial change works or before committing.
---

# Verify forgevid

Run stages in order; stop at the first FAIL, report the output verbatim, fix,
re-run. **Never report a stage passed without seeing its output this session.**

Every consequential bug in this repo was found by *running* the thing. These
suites exist because reading the code was not enough.

## Stage 1 — types (always)

```
npm run type-check
```

Check the **exit code**. Never `npx tsc` — it resolves an unrelated binary here
and prints "This is not the tsc command you are looking for". Never grep its
output for `error TS` and conclude success from an empty grep.

## Stage 2 — the runtime suites (any change under `lib/` or `scripts/`)

```
npm run verify:generate   # the renderer: ~240 assertions against real ffmpeg
npm run verify:site       # URL ingestion + SSRF guards, real sockets
npm run verify:proxy      # the headless browser's egress proxy
npm run verify:export     # timeline export
```

These render actual video and open actual sockets. They are slow, and they are
why the renderer works. Add to them; never route around them.

## Stage 3 — database (schema, migrations, anything Prisma)

```
npm run verify:e2e:db
```

Spins a throwaway Postgres on a **random free port**, applies every migration to
an empty database, runs the suite, tears down. Never bind a fixed port — a
parallel session's scratch server lives somewhere too.

## Stage 4 — production build (config, env, imports)

Must pass with **every provider key unset**:

```
env -u OPENAI_API_KEY -u ELEVENLABS_API_KEY -u PEXELS_API_KEY \
    -u STRIPE_SECRET_KEY -u ENCRYPTION_KEY -u JWT_SECRET npm run build
```

## Stage 5 — DRIVE THE REAL BROWSER (UI, middleware, server.js, next.config)

The stage that is always skipped and never should be. Three bugs shipped through
a fully green suite because curl exercises the API and never the browser:

- client fetches carried no CSRF header → every mutation 403'd
- the CSP forbade Next's own inline bootstrap → **React never hydrated**
- express-rate-limit counted `/_next` chunks → the app 429'd its own assets

Playwright is installed. Boot the real server (`npm run dev`, i.e. `node
server.js` — not `next dev`), load the page, and assert hydration:

```ts
const el = document.querySelector('#some-component');
Object.keys(el).some((k) => k.startsWith('__react')); // must be true
```

Collect `console` errors and `requestfailed` events. **Zero of each**, or you
have verified nothing.

Note: Playwright's headless Chromium ships **no H.264**, so an `.mp4` will not
play in it (`videoWidth === 0`). Serve a WebM alongside if you need to test
playback.

## Stage 6 — live providers (only if the change touches them; costs money)

```
npm run verify:providers
```

Real OpenAI, ElevenLabs, Pexels, HeyGen. Deliberately cheap (~70 characters of
TTS, zero HeyGen credits). It will not start a paid avatar render.

## Verifying video output

Never trust metadata; look at the pixels and measure the audio.

- **Frames.** Extract stills at scene midpoints and *view* them. A "cinematic
  showcase of a video editor" once opened on a marble kitchen counter and closed
  on a lipstick advert. The metadata was perfect.
- **Audio.** Transcribe the render back with Whisper and compare it to the
  intended script. Measure with `volumedetect` — and **band-pass the stem you
  care about**, because a voice sitting on top of ducked music hides the duck.
- **Overlays.** Render onto a solid white clip and measure luminance. That is how
  you prove a caption scrim or a lower third is genuinely visible, rather than
  present in the filter string.

## Report

| Stage | Command | Result |
|---|---|---|
| types | npm run type-check | PASS/FAIL |
| runtime suites | verify:generate / site / proxy / export | PASS/FAIL |
| database | npm run verify:e2e:db | PASS/FAIL/N-A |
| build (no keys) | npm run build | PASS/FAIL |
| browser | Playwright: hydrated, 0 console errors | PASS/FAIL/N-A |
| providers | npm run verify:providers | PASS/FAIL/N-A |

`N-A` needs a stated reason. A FAIL anywhere means not done.
