# ForgeVid TODO — "Generate videos like InVideo"

Derived from the 2026-07-07 code audit. Ordered by the recommended build order.
Each item has a file pointer and an acceptance criterion so "done" is verifiable.

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done (needs a passing verification command in the same session)

---

## Progress log

**2026-07-07 — Phase 0 done; Phase 1 core done.**
- Repo isolated at `C:\Users\yanp0\dev\forgevid` (was rooted at OneDrive; 654 files were unretrievable OneDrive placeholders — reconstructed from git history). Old OneDrive `.git` still exists and should be neutralized.
- Stale docs/dead code removed; missing deps installed; **`npm run type-check` exits 0** (was 701 errors — the project never compiled).
- Async pipeline built: `lib/video-queue.ts` (Redis-optional BullMQ), `lib/generation-pipeline.ts` (shared orchestrator, fails visibly — no placeholder substitution), `workers/video-worker.ts` (`npm run worker`), `GET /api/ai/jobs/[videoId]` status endpoint. `POST /api/ai` now creates a `Video` row (PROCESSING) and enqueues/inline-runs, returning `videoId` immediately; the dashboard polls real progress instead of a fake timer.
- Verified here: type-check (0 errors) + worker module-graph smoke test. NOT yet verified: end-to-end generation (needs Redis/DB/OpenAI/Pexels/ElevenLabs/Cloudinary keys + ffmpeg).
- Still open in Phase 2: thumbnail generation, `POST /api/videos` (returns 501), add DRAFT/QUEUED to `VideoStatus` enum (needs a DB migration).

**2026-07-08 — Phase 3 done; Phase 8 done; the app builds for the first time.**
- `lib/video-generator.ts` split into `planScenes` → `resolveSceneClips` → `assembleVideo`. Scenes persist to `Video.metadata.scenes`.
- Scene editing: `GET/PATCH /api/videos/[id]/scenes`, `POST /api/videos/[id]/scenes/[sceneId]/swap`, `POST /api/videos/[id]/rerender` (async, same progress endpoint). UI: `components/scene-editor-panel.tsx` on the AI Studio page.
- **Phase 8 done**: deleted `getFallbackVideos()` and the `replicate-video.ts` sample returns — generation now fails visibly instead of shipping Google's `ForBiggerBlazes.mp4`.
- Footage quality: full-description search before keyword fallback + cross-scene clip dedupe (was one keyword, random pick from top 3).
- **`npm run build` now exits 0** (was a hard failure). Root cause: OpenAI/Stripe clients constructed at module scope, plus `ENCRYPTION_KEY`/`JWT_SECRET` throws at import — all deferred via `lib/lazy-client.ts`. Also fixed two prerender errors.
- Caution: `npx tsc` resolves an unrelated `tsc` binary here. **Verify with `npm run type-check` and check the exit code**, not by grepping output.

**2026-07-08 — Phase 4 done (decision: keep FFmpeg, no Remotion/Creatomate).**
- Decision rationale: we already have a working FFmpeg assembler that handles remote assets. Remotion means running a React render farm; Creatomate is per-render cost and ships user content to a third party. Neither is warranted — the timeline export is the same problem the generator already solves.
- `lib/video-export.ts` rewritten: resolves remote assets (was: treated `assetId` as a filesystem path and silently skipped everything), fills timeline gaps with black to preserve timing, mixes audio tracks with `adelay`/`amix`, renders text clips as `drawtext`, cleans temp files in `finally`. Deleted `createPlaceholderVideo` (last Phase 8 placeholder).
- `/api/editor/export` now resolves `assetId` → `MediaAsset.url` and returns 422 for unresolvable clips / empty timelines instead of exporting a blue placeholder.
- **Runtime verified**: `npm run verify:export` renders a real timeline with ffmpeg (gap filler, audio mix, text overlay) and asserts duration/streams/resolution. This is the first behavior-verified component.
- Two real bugs that only running it could find: a corrupted `drawtext` filter (see the precise rule below), and `-shortest` never terminating against `apad` coming out of `filter_complex` (bound output with `-t` instead).

> **fluent-ffmpeg footgun (corrected).** The Phase 4 commit message said fluent "splits outputOptions entries on whitespace". That is imprecise. The real rule (`node_modules/fluent-ffmpeg/lib/options/custom.js`, `split.length === 2`): an array entry is split **only when it contains exactly one space** — so `'-c:v libx264'` splits (intended), a filter with two spaces survives, and a filter with *exactly one* space is torn in half. A two-word caption like `"Opening shot"` therefore corrupted the generator's `-vf`, while `"Test scene 1"` silently worked. **Never pass a filter graph through `outputOptions`** — use `.videoFilters()` or `.complexFilter()`, which pass it as a single argv entry. Covered by a regression case in `npm run verify:generate`.
- Known scope limits: audio embedded in video clips is dropped (audio comes from audio tracks); no multi-video-track layering; `drawtext` relies on a system font (may fail in a bare Linux container — bundle a font before deploying).

**2026-07-08 — Phase 5a done: aspect ratio (16:9 / 9:16 / 1:1).**
- Threaded through the whole path: render size *and* Pexels search orientation (landscape footage in a 9:16 frame is mostly letterbox). Persisted in `metadata.request.aspectRatio` so re-render and scene-swap keep the shape.
- UI selector on the AI Studio page; `resolution` now written to the `Video` row.
- `assembleVideo` accepts local source paths (not just URLs), so it is testable offline; it now deletes only files it created.
- **Runtime verified**: `npm run verify:generate` renders all three ratios with ffmpeg and asserts 1920x1080 / 1080x1920 / 1080x1080 + durations, plus a guard that caller-owned sources survive cleanup.

**2026-07-08 — Phase 5b done: background music + ducking.**
- `lib/music-library.ts` reads `public/music/tracks.json` (moods → track). **No tracks are bundled** — music needs a license; see `public/music/README.md`. Empty library ⇒ generation still succeeds, just silent. The UI's "Background Music" add-on was already there and inert; it now does something.
- Music is looped (`-stream_loop -1`) and ducked under narration via `sidechaincompress`. The final pass moved from `-vf` to `complexFilter` (ffmpeg accepts one or the other, not both).
- `assembleVideo` gained `AssembleOptions { musicPath, musicVolume, voiceoverPath }`. Injecting a voiceover lets a re-render skip a paid TTS call — and makes the whole assembler testable offline.
- **Runtime verified, and it caught two real bugs:**
  1. `sidechaincompress` stops when its *sidechain key* ends, so the music died the instant narration stopped (audio ended at 2s of a 4s video). Fixed by `apad`-ing the key + `amix=duration=longest`.
  2. the cleanup block unlinked `voiceoverPath` unconditionally, deleting a caller-injected voiceover.
  Ducking is *measured*, not assumed: `volumedetect` shows −40 dB under narration vs −36.1 dB after it ends.

**2026-07-08 — Phase 5d done: voice catalog + selection.**
- `lib/voice-catalog.ts` is now the single source of voices and the TTS model. The hardcoded voice id (`ErXwobaYiN019PkySvjV`) appeared in two places and the model was the deprecated `eleven_monolingual_v1` → now `eleven_multilingual_v2`.
- 8 ElevenLabs voices, `GET /api/voices` (static catalog, so the UI populates before a key exists), voice picker in the AI Studio shown when the Voiceover add-on is on. Unknown ids fall back to the default rather than being sent to the API.
- Default stays Antoni, so existing projects don't silently change voice.
- `voiceId` persists in `metadata.request` so re-render reuses it.
- Verified by type-check + build + the renderer suites; **not** runtime-verified end-to-end (needs an `ELEVENLABS_API_KEY`).

**2026-07-08 — Phase 5c done: real captions + SRT/VTT export.**
- `lib/captions.ts`: `transcribeToCues()` (Whisper `verbose_json` segments) → timed cues aligned to the *spoken narration*, replacing the old "burn in the scene description" behaviour. Degrades cleanly: no voiceover or no `OPENAI_API_KEY` ⇒ falls back to one cue per scene (the old behaviour), never fails the job.
- Word wrap, multi-line stacking, and `CAPTION_PRESETS` (default / large / subtle).
- Cues persist to `metadata.captions`; `GET /api/videos/[id]/captions?format=srt|vtt|json` downloads them, with SRT/VTT buttons in the scene panel.
- Burned in with `drawtext`, deliberately **not** the `subtitles` filter: avoids a libass dependency in the deploy image and avoids escaping a Windows `C:\...` path inside a filtergraph.
- **Runtime verified**: exact SRT/VTT byte assertions, `wrapText`, and a caption containing `,` `:` `'` and `%` actually rendering — a comma is what separates filters in a filtergraph, so this is the case that would silently break the graph.

**2026-07-08 — Phase 2 complete.**
- **Thumbnails**: a poster frame is grabbed ~1s in, *before* `persistGeneratedVideo` deletes the local render, uploaded to Cloudinary when configured, and written to `Video.thumbnail`. Best-effort — a failed thumbnail never fails a generation. Runtime-verified in `verify:generate` for all three ratios.
- **`POST /api/videos`** no longer returns 501: it creates an empty editor project (a `DRAFT`). Generation stays `POST /api/ai`; upload stays `POST /api/videos/upload`.
- **`VideoStatus` gained `DRAFT` and `QUEUED`** (migration `20260708120000_add_video_status_draft_queued`). Template-instantiated projects are `DRAFT` again (they were mislabelled `PROCESSING`, i.e. "rendering forever"); a generation row starts `QUEUED` and flips to `PROCESSING` when a worker actually picks it up.
  - ⚠ **The migration has never been applied** — there is no database here. `prisma validate` passes and the SQL is two `ALTER TYPE ... ADD VALUE IF NOT EXISTS` statements, but run `npx prisma migrate deploy` against a real DB before trusting it. Note `ALTER TYPE ... ADD VALUE` requires **PostgreSQL 12+** to run inside a transaction.
- Fixed a Prisma major-version mismatch: CLI was 5.x while `@prisma/client` was 6.x.

**2026-07-08 — Linux deploy blocker fixed: caption font.**
- `drawtext` with no `fontfile` relies on fontconfig finding a "Sans" family. `node:18-alpine` ships **no fonts**, so every captioned render would have died in production with "Cannot find a valid font".
- `resolveCaptionFontFile()` now **searches** `/usr/share/fonts`, `/usr/local/share/fonts`, macOS and Windows font dirs (2 levels deep) for a preferred face, rather than hardcoding a path — Alpine moved DejaVu's install location between releases. `CAPTION_FONT_FILE` overrides. No font ⇒ captions are dropped with a clear error, the video still renders.
- `escapeFontPath()`: a filtergraph uses `:` to separate options, so a Windows `C:\...` path must become `C\:/...`. Verified by rendering with an explicit `fontfile`.
- Dockerfile installs `fontconfig` + `font-dejavu` (falling back to `ttf-dejavu`, since Alpine renamed it). ⚠ **The Docker build is unverified** — no Docker daemon here.
- `lib/video-export.ts` reuses the shared escaper/font resolver (it had a duplicate escaper with the same bug).

**2026-07-08 — Phase 6 done: brand kit + free-tier watermark.**
- `lib/plan.ts`: server-side plan resolution. The app only had a *client* `useSubscription()` hook — a watermark enforced in the browser is decoration. Fails closed: an expired/`past_due` subscription is treated as FREE, so it can't keep unlocking clean output.
- `lib/brand-kit.ts` + `BrandKit` model (migration `20260708130000_add_brand_kit`): logo overlay (opacity, corner), caption colour, brand typeface, intro/outro clips.
- Branding is resolved **from the video's owner at render time**, never from client input, and re-resolved on re-render so a downgrade re-applies the watermark.
- `primaryColor` is interpolated into an ffmpeg filtergraph, so it is hex-validated in two places — a value like `red':x=0,drawtext=text='pwned` is rejected.
- `GET/PUT /api/brand-kit` (PUT is 403 for free plans).
- **Runtime verified**: the plan gate, filtergraph-injection rejection, a branded render with watermark + logo overlay + intro/outro concatenating to exactly 4.00s (proving duration probing + bookend normalization), and `shiftCues` delaying captions by the intro duration.
- Bug avoided by testing: an intro prepended to the render would have made every caption fire early — cues are timed relative to the scenes, so they must shift.
- ⚠ Migration unapplied (no DB here).
- Brand-kit UI shipped as a "Branding" tab in dashboard settings, plus `POST /api/brand-kit/logo` (multipart → Cloudinary). Needed because `/api/media` never actually uploaded anything — it records a url and falls back to a literal `placeholder-<type>-url`.

**2026-07-08 — Phase 7a done: scene transitions (xfade).**
- **Found a bigger bug than the feature.** `@ffmpeg-installer/ffmpeg` pins a **2018 build (N-92722)** with no `xfade` (added in ffmpeg 4.3). And `setFfmpegPath(installer.path)` was called unconditionally, so the Dockerfile's `apk add ffmpeg` was overridden — that ancient binary ran in production too.
- `lib/ffmpeg-env.ts`: resolve `FFMPEG_PATH` → `ffmpeg-static` (6.1.1) → system `ffmpeg` → the bundled 2018 build, and **probe filter capabilities** instead of assuming them. `ffmpeg-static` is now a runtime dependency. Transitions degrade to hard cuts with a clear warning on an old binary rather than failing the render.
- `lib/transitions.ts`: xfade **overlaps** clips, so a naive chain of N scenes loses `(N-1)×D` seconds — the fixed-length narration would then outrun the video and every caption would land late. Each clip but the last is padded by `D`, so the total stays `sum(sceneDurations)` and cue times need no adjustment. Duration clamped to half the shortest scene; <100ms is treated as a cut.
- Transition persists in `metadata.request.transition` (validated against the allowed list) so re-render matches.
- **Runtime verified on ffmpeg 6.1.1**: 3×2s scenes with a 0.5s fade render to exactly **6.00s**, hard cuts also 6.00s, plus the padding math and an explicit assertion that the *unpadded* chain would lose 1s (the bug this guards).

**2026-07-08 — Phase 7b done: Ken Burns on stills + photo fallback.**
- `resolveSceneClip` previously **threw** when no video matched a scene, failing the whole generation. It now falls back to a Pexels **photo**, and stills get Ken Burns motion — a still held for seconds reads as a broken video.
- `lib/ken-burns.ts`: `zoompan`'s `d` is in **frames, not seconds** (the classic bug), and zooming a frame already at output size stair-steps — so we supersample 2× before zooming and let zoompan emit at the output size. Direction alternates per scene. Degrades to a static fit if `zoompan` is missing.
- `ResolvedScene.mediaType` is optional so scenes persisted before this still load.
- **Runtime verified**: frame count math, supersampling, and a real render — a still becomes a 3.00s h264 clip at 1920×1080 whose **first and last frames differ**, proving it actually zooms rather than holding static (duration + codec alone would pass for a static hold).

**2026-07-08 — Phase 7 complete, plus the two long-standing items.**
- **`OPENAI_SECRET_KEY`**: correcting an earlier overstatement — it is *documented* (docs, `ENV_SETUP_INSTRUCTIONS.md`, `docker-compose.prod.yml`), so it works if you set **both** vars; but `.env.example` lists only `OPENAI_API_KEY`, so anyone following it got silently dead feature modules. `lib/openai-key.ts` now resolves `OPENAI_API_KEY || OPENAI_SECRET_KEY`. A rename would have broken existing deployments.
- **Replicate: DROPPED.** `lib/replicate-video.ts` deleted. Its only consumer built the transcript as the literal string `Transcribed audio from ${size} byte file` and fed *that* to Zeroscope — the feature never transcribed anything. `/api/voice-to-video` now really transcribes with Whisper and enqueues the normal async pipeline, inheriting scenes/captions/music/branding/progress. Fails visibly (503 no key, 422 unusable audio) instead of inventing a transcript. Also removed a hardcoded `Confidence: 95%` stat and fixed base64 encoding that overflowed on recordings longer than a few seconds.
- **User media** (`lib/user-media.ts`): assets resolve from **ids against the owner** — never urls from the client, or the renderer would fetch arbitrary server-side URLs. They fill scenes in order, so a fully-covered generation **no longer needs `PEXELS_API_KEY`**; a partially-covered one fails visibly and names the coverage. Image assets get Ken Burns.
- **Chat editing** (`lib/scene-ops.ts`, `POST /api/videos/[id]/scenes/chat`): the model only proposes operations from a closed set; a zod boundary + a **pure** `applySceneOps` do the work. A hallucinated scene id, an unknown op, a 900-second scene — all rejected before the DB. Deleting reindexes (captions/user-media depend on `index`) while ids stay stable, and the last scene can't be deleted. The model is never shown clip urls.
- **`OneDrive\.git` neutralized**: moved (not deleted) to `C:\Users\yanp0\dev\forgevid-legacy-onedrive-git\.git` — 274MB, tracked only forgevid, would have swept in 409 personal files. A leftover empty `git init` inside the OneDrive project folder was also removed. **Nothing under OneDrive is a git repo any more.** That history is no longer backed up to the OneDrive cloud.
**2026-07-09 (night) — THE APP WAS RATE-LIMITING ITSELF.**
- Symptom the user hit: `Hydration failed because the initial UI does not match what was rendered on the server` — React expecting a `<div>` where the server sent `<header>`.
- Real cause, found by driving a real browser: `server.js` applied `express-rate-limit` to **every request** at **100 per 15 minutes per IP**, counting each `/_next` chunk, stylesheet, font, image and video. One Next.js page load exceeds that on its own, so the server answered its own assets with **429 JSON**. The browser then refused them (`MIME type 'application/json' is not executable` / `not a supported stylesheet MIME type`), React couldn't hydrate against a half-loaded page, and the browser fell back on stale cached chunks — producing the div/header mismatch. **Any real visitor loading the site twice would have been locked out for fifteen minutes.**
- Fixed: the limiter now skips GET/HEAD on `/_next`, `/static`, `/videos`, `/images`, `/generated`, `/uploads`, `/music`, favicon/robots/sitemap and the health checks, and the budget rose to 300. Serving a static file is cheap; an unauthenticated API call is not — limit the latter.
- Verified live: 200 consecutive requests for `webpack.js` → **199×200, zero 429s**; the limiter still trips on API abuse (429 on a POST flood) and static assets keep serving 200 *after* it trips. Browser check: **zero console errors, `hydrated: true`**, DOM matches the server exactly.
- Note for future me: three bugs in a row (CSRF headers, blocked inline scripts, self-429) all hid behind the same blind spot — curl exercises the API, never the browser. Drive the real UI.

**2026-07-09 (evening) — landing page, and the bug that made the whole app dead.**
- **THE CSP FORBADE NEXT'S OWN SCRIPTS.** `next.config.mjs` set a STATIC `script-src 'self' https://js.stripe.com`. Next bootstraps the client with INLINE `<script>self.__next_f.push(...)</script>`, which that policy refuses — so **React never hydrated and the entire application was a dead static shell in a browser**: no Generate button, no scene editor, no navigation, nothing needing JavaScript. Proven with Playwright (`hydrated: false`, zero `__reactFiber$` keys). Fixed with a per-request nonce (`middleware/csp.ts`): Next reads the nonce from the CSP header we attach to the REQUEST and stamps it on its inline scripts. `strict-dynamic` lets those load the chunks; `'unsafe-inline'` remains only as a fallback modern browsers ignore. Static CSP removed from next.config (a static header cannot carry a nonce). Verified: `hydrated: true`, hero autoplays, hover-to-play works, **no console errors, no failed requests**.
- Landing page rebuilt: full-bleed video-background hero using a REAL ForgeVid render (the product demonstrating itself), scrim for legibility, `prefers-reduced-motion` shows the poster instead. Nav + two CTAs, "Made with ForgeVid" examples strip, 3-step how-it-works, footer.
- **Deleted the fabricated social proof** ("TechCorp / StartupXYZ / MediaCo / CreativeInc") and the six empty "Sample Project" gradient tiles. Every example on the page is a real render, captioned with the actual prompt that produced it.
- Examples: 4 clips generated through the live API (16:9 product ad, 9:16 social reel, 1:1 travel, 16:9 property tour). Two had weak footage; fixed via the new `searchQuery` PATCH + `/swap` + re-render — dogfooding the fix from the previous commit.
- Media: hero re-encoded 7.3MB -> 680KB (720p, CRF30, faststart); WebM/VP9 sources added alongside MP4 because **not every browser ships an H.264 decoder** (headless Chromium doesn't — `canPlayType('avc1') === ''`). Tiles use `preload="none"` and play on hover only. Whole page's media is ~4.4MB across both codecs, and only the hero loads up front.
- Uniform tile heights with `object-contain` on black: cropping a 9:16 reel into a 16:9 box would hide the very thing that strip exists to show.
- `/videos/` and `/images/` added to the middleware static skip list — the same 307-redirect bug, in a path I had just created.

**2026-07-09 (later) — every finding fixed, plus the features that were missing.**
- **The Generate button was broken in a browser.** `/api/ai`, the scene editor's swap/save/chat, and re-render all POST without an `x-csrf-token`, and the CSRF middleware answers 403. They only ever "worked" because I drove them from curl with the header set by hand. Fixed once, globally: `installCsrfFetch()` wraps `window.fetch` so every same-origin mutating request carries the token (cross-origin requests never do).
- **Wrong footage, root cause fixed.** Scene *descriptions* were being used as stock-search queries by taking their first six words — `"Close-up of person's smile watching finished"` retrieved a lipstick clip. Prose and a search term are different things. The planner now emits an explicit `searchQuery` per scene (concrete nouns, no camera grammar, no emotions), `lib/stock-query.ts` sanitizes it (and rescues legacy scenes), and keyword PAIRS are tried before single words. Live result: a 5-scene promo where **every scene was on-brief on the first try** (previously 2 of 5 were wrong).
- **A 15s request rendered a 62s video.** Upgrading the planner to gpt-4o-mini exposed that per-scene durations from the model were never bounded — it returned ~12s per scene for a 15s video, and gpt-3.5 had simply happened to comply. `normalizeSceneDurations()` now rescales to the requested total, keeping the model's relative weighting, with a 1s floor and the rounding drift placed on the longest scene.
- **Choose a specific image for a scene** (the real gap behind "can users change the images?"): `POST /api/videos/[id]/scenes/[sceneId]/media { assetId }`, ownership-checked, plus a "Choose image" button wiring the media picker into the scene editor. `/swap` re-rolls the dice; this is the "no, THAT one". `PATCH /scenes` also accepts `searchQuery` now, so editing the search term and swapping re-resolves footage deliberately.
- **Music, honestly.** No track is bundled (each needs a licence; shipping one would hand users a copyright claim), so the mixing pipeline had nothing to play. `GET/POST /api/music` lets a user upload their own; `musicAssetId` is ownership-checked and threaded through generation AND re-render. Verified live: 10.00s output, real AAC stream, `mean_volume -33.2 dB`.
- **Static media no longer 307s.** `/generated`, `/uploads` and `/music` are exempt from middleware — every video byte and thumbnail was paying for security headers, CSRF and *rate limiting* before being redirected to `/en/...`.
- **Fewer sparse pages, no browser needed**: JSON-LD (`@graph`, Organization/Product) and real `<noscript>` copy are now read, which rescues most client-rendered shells.
- **Headless fallback for the rest** (`HEADLESS_BROWSER=1`, optional `playwright`): renders JS-only pages and screenshots the live product UI as scene stills. The security work is the point — Chromium resolves its own DNS and walks straight around `safe-fetch`, so **all** browser egress (loopback included, via `--proxy-bypass-list=<-loopback>`) is forced through `lib/guarded-proxy.ts`, which IP-vets every request and CONNECT. `npm run verify:proxy` proves it refuses loopback, metadata and 10.x on both paths, and that an internal body never leaks.
- Gates: type-check, verify:site (130), verify:proxy (7), verify:generate (161), verify:export, verify:e2e:db, and a production build with every provider key unset and playwright absent.
- Trap, third time: escape sequences don't survive a bash heredoc — a `'
'` lands as a real newline and breaks the string. Write test files with the editor.

**2026-07-09 — PASTE A URL, GET A COMMERCIAL.**
- `POST /api/site-brief`: read a page, write a grounded commercial script, and import the page's own hero images as the user's MediaAssets. UI: a URL box at the top of the AI Studio that fills the prompt and selects the imported images.
- **The SSRF boundary is the feature's real work** (`lib/safe-fetch.ts`). The IP is validated *inside* the socket's `lookup` hook, so a DNS-rebinding answer cannot slip a private address in behind the check. Also: scheme allowlist, no embedded credentials, per-hop re-validation on redirects, response size/time/type caps, `Accept-Encoding: identity`.
- **`npm run verify:site` — 107 assertions**, adversarial and real (not mocked): cloud metadata (incl. v4-mapped/NAT64/6to4 wrappings), private + CGNAT + link-local ranges, the /12 off-by-one, `file:`/`javascript:`/credentials/`localhost`, a live loopback refusal, a real DNS-rebinding host (`localtest.me`), redirect->metadata, redirect->`file://`, redirect loops, timeouts, and charset decoding (windows-1252/iso-8859-1 pages, so "Rentabilité" doesn't become "RentabilitÃ©").
- Anti-fabrication: the model gets only what we actually read, is told never to invent claims, and its reply is Zod-validated before it can reach the renderer. Checked live — the "50% of Fortune 100" line in the Stripe script IS on Stripe's page.
- **Two real bugs found by running it**, not by reading it:
  1. `downloadFile` treated `/uploads/site/x.jpg` as a filesystem path -> "Scene source not found on disk". Locally-stored *product shots* had the same latent bug.
  2. Fixing (1) then armed a worse one: cleanup decided "is this file mine to delete?" by comparing the returned path to the input url. Resolving a local url made those differ, so **the renderer deleted the user's own uploaded images**. Replaced the string-identity heuristic with an explicit `{ path, downloaded }` — a whole class of bug removed. Pinned by a test that asserts the source image survives.
- **Live proof**: `stripe.com` -> 5-scene commercial, scene 1 is *Stripe's own hero image* with Ken Burns, scenes 2-5 matched stock, real narration, 17.9s. Rate-limited 20 site-imports/user/hour, failing closed on a DB error.
- Trap (third time): escape sequences do not survive a bash heredoc — `'
'` lands as a literal newline and breaks the string. Write test files with the editor, not heredocs.

**2026-07-09 — first UI login, natural voices, avatar picker — all verified over HTTP.**
- **Persistent dev DB**: `npm run db:local` — dedicated cluster on `127.0.0.1:54329`, data in `../forgevid-db`; all migrations applied. `.env.local` carries `DATABASE_URL`/`NEXTAUTH_URL`/`NEXTAUTH_SECRET`.
- **Two more launch-blockers found by the first real HTTP session**: (1) `express.json()` in `server.js` drained request bodies — **every POST hung forever** while GETs looked healthy; (2) `middleware/csrf.ts` imported Node `crypto`, which the Edge runtime lacks — **the middleware 500'd nearly every route**. Rewritten on Web Crypto.
- **First login verified end-to-end over HTTP**: register 201 -> app CSRF double-submit -> NextAuth credentials 200 -> session -> authed APIs.
- **Natural vs AI voices**: studio radio "AI voice" / "My own recording"; `POST /api/narration` stores an AUDIO MediaAsset; `narrationAssetId` is ownership-checked in the pipeline, replaces TTS, and captions come from Whisper on the user's recording. Verified over HTTP including a **full 8s draft generation through the API** (~30s: QUEUED->script->assembling->COMPLETED, 960x540 h264+AAC, 4 GPT scenes, quota billed, $0.035 booked). The caption read "Oh" because the test sample was a sine-tone cache artifact — proof the transcription ran on the actual uploaded audio.
- **Avatar picker**: "AI Presenter" tab (HeyGen grid with previews, script, aspect, generate+poll). Plan gate verified over HTTP both ways: **403 + upgradeRequired as free; the live 1,264-avatar catalog as Pro**. Renders only start on explicit click.
- Ops traps: curl may take IPv6 `::1` where responses die (use `127.0.0.1`); never pipe a dev server through `head`; the cookie jar holds both `next-auth.csrf-token` and the app `csrf-token` — extract by exact name.

**2026-07-08 — FIRST LIVE PROVIDER RUN (ElevenLabs + HeyGen keys added).**
- Keys had landed in the old OneDrive copy's `.env` (with a duplicate `ELEVENLABS_API_KEY`); transplanted the last occurrence of each into `dev/forgevid/.env.local` (gitignored, values never displayed).
- `npm run verify:providers` (new): **all green on the first attempt** —
  - ElevenLabs: key valid, 22 voices; **real speech synthesized through the per-scene pipeline** (2.12s + 1.38s segments); repeat call served entirely from cache (**no charge on re-render — verified live**).
  - Full render with real narration: **scenes were cut to speech** (2.47s/1.73s instead of the requested 5s each) and the output carries the real AAC narration. Kept for listening at `public/generated/`.
  - HeyGen: key valid, **1,264 avatars listed**. No render started — avatar renders bill credits; that stays a UI opt-in.
- Now live-verified: ElevenLabs TTS + per-scene cache + narration pacing + HeyGen auth/list. Still not live-verified: a paid HeyGen render, ElevenLabs voice-add (needs a real voice sample), OpenAI/Pexels/Cloudinary, the Docker build.

**2026-07-08 — avatars, voice cloning, and a collision-proof e2e runner.**
- **Port fix**: `npm run verify:e2e:db` (scripts/run-e2e-with-db.sh) spins a throwaway Postgres on a **random port (49152-63151)**, migrates, runs the suite, tears down on exit — no more collisions with the parallel SHAREDRIVER session's scratch server on 55432. Verified twice (ports 52708, 49187).
- **Voice cloning** (Pro+): `ClonedVoice` model (+migration `20260708160000`), `POST /api/voices/clone` (multipart -> ElevenLabs /v1/voices/add, 503 without key, 502 surfaces provider errors), cloned voices appear in `GET /api/voices` and are valid `voiceId`s. Resolution is ownership-checked: an unowned id falls back to the default and is **never sent upstream** (e2e-verified against the real DB).
- **AI avatars** (Pro+): HeyGen v2 integration (`lib/avatar-provider.ts`), `GET /api/avatars`, `POST /api/avatars/generate` — same contract as every generation (videoId + poll `/api/ai/jobs/[id]`), shares the monthly quota, books $0.50/min into the cost ledger. The **payload builder is pure and pinned by tests** (avatar id, script, dimensions per aspect, optional voice pass-through).
- ⚠ Honesty line: the **live** ElevenLabs voice-add and HeyGen calls are unverified here (no keys). What IS verified: plan gates, quota sharing, ownership checks, payload contract, cost math, migrations on a fresh DB, and that every unconfigured path 503s instead of faking output.
- Lesson (twice now): text written through bash-heredoc→Python can silently turn `
` into a real newline, and `scripts/` is outside the app tsconfig so tsc won't catch it — esbuild does, at run time. Check the suite actually *ran*.

- Suite is now **104 runtime assertions** (`npm run verify:generate`) + `verify:export`.

**2026-07-08 — END-TO-END VERIFIED against a real PostgreSQL database.**
- Ran an isolated Postgres 18 cluster on port 55432 (own data dir, trust auth) so nothing touched the user's own server on 5432. Torn down afterwards.
- **`prisma migrate deploy` applied all migrations cleanly**, including the two hand-written ones (`DRAFT`/`QUEUED`, `brand_kits`). `VideoStatus` really does gain `DRAFT,QUEUED`; `brand_kits` exists with its FK. Those are no longer "unverified".
- **Found a real, pre-existing bug: the migration history did not match `schema.prisma`.** The project had been evolving with `prisma db push`, which records no migration — so a fresh `migrate deploy` produced a schema missing two whole tables (`sso_configurations`, `beta_access_entries`), two `video_exports` columns (`fileUrl`, `progress`) and ~30 indexes. **A clean production deploy would have crashed** on SSO lookups and editor exports. Fixed by `20260708140000_sync_schema_drift`; `prisma migrate diff --exit-code` now reports **no drift**.
- `npm run verify:e2e` drives the real pipeline (no external APIs needed — user media covers the scenes, the script falls back to the prompt, the render stays local) and asserts against the database: `QUEUED → PROCESSING → COMPLETED`, url/resolution/thumbnail persisted, the mp4 and thumbnail exist on disk, scenes + captions persisted, the user's own media used instead of stock, re-render honours edited scene durations (2+2+2 = 6.00s), and the plan gate resolves free → watermark, ACTIVE pro → clean, **PAST_DUE → back to watermark (fails closed)**.
- The fail-visibly path is asserted for real: with no media and no `PEXELS_API_KEY` the job **throws**, the row is `FAILED`, the stored error names the missing key, and **no url is written**.
- Teardown note: `subscriptions_userId_fkey` is `RESTRICT`, not `CASCADE`, so deleting a user requires deleting its subscriptions first.
- Still unverified: OpenAI/ElevenLabs/Pexels/Cloudinary calls (no keys), the Docker build (no daemon), and the HTTP routes themselves (need a NextAuth session).

**2026-07-08 — Tier 1 revenue hardening (pre-launch blockers).**
- **Editor export watermark hole closed**: `exportTimelineVideo` takes `watermarkText`, and `/api/editor/export` resolves it from the **owner's plan server-side** (client input for it is discarded). Verified by rendering the same timeline with and without the watermark and asserting the outputs differ at the byte level.
- **Quotas** (`lib/quota.ts`): free 3 videos/mo & 60s max, starter 20/180s, pro 100/600s. Enforced in `/api/ai` and `/api/voice-to-video` (voice input isn't a bypass); usage recorded on job *acceptance* so requeue-while-running can't dodge it; fails closed on lookup errors. Rejections name the limit and carry `upgradeRequired` — that's the Stripe upgrade pressure. Verified against real `UsageRecord` rows (duration cap, 4th-video rejection, pro lift).
- **Render semaphore** (`lib/render-semaphore.ts`, `RENDER_CONCURRENCY`, default 2): throttles the no-Redis inline path on all three routes (generate, re-render, voice-to-video). Verified: 5 concurrent jobs never exceed 2 active, FIFO order, failed job releases its slot.
- **Cost ledger** (`lib/cost-ledger.ts`): every generation writes an `AIGeneration` row with an estimated cost (GPT tokens from the real response, TTS chars, Whisper minutes, render minutes; rates in `RATES`). Recorded in the *pipeline*, so worker and inline both book. Admin revenue now returns `aiCosts` (period/all-time spend, generation counts, gross margin vs MRR). Verified: the e2e generation booked $0.006917 for a 6s render.

**2026-07-08 — Tier 2 output-quality multipliers.**
- **Narration-paced scenes + per-scene TTS cache** (`lib/voiceover.ts`) — items #5 and #7 as one mechanism. Each scene's line is synthesized separately (cached by `sha256(description|voice|model)` in `.cache/tts/`), and **the audio decides the scene's duration** (`audio + 0.35s`), so scenes are cut to speech instead of speech being trimmed/padded to GPT's guesses. Cues come per-scene for free (no Whisper charge on this path). Verified with an injectable synth: 10s requested → 3.80s speech-length video; **zero synth calls on an unchanged re-render**; editing one scene re-synthesizes only that scene; cue 2 starts exactly at scene 2. Falls back to whole-narration synthesis (and Whisper cues) when per-scene fails.
- **Per-scene thumbnails**: extracted from the trimmed clips before the xfade pass merges them; persisted on each scene; shown in the scene editor panel. Verified for all three aspect ratios.
- **Draft previews** (`renderQuality: 'draft'`): half resolution + `ultrafast`/crf 30 (exports stay `slow`/18). "Fast draft preview" checkbox in the AI Studio; re-render reuses the stored quality. Verified: 960×540, full duration kept.
- `assembleVideo` now returns the scenes **as rendered** (paced durations + thumbs) and both generate and re-render persist those — otherwise the editor drifts from the video.

**2026-07-08 — Tier 3 growth loop + the product loop (platform memory).**
- **Product loop** (`lib/product-loop.ts`) — record → recall → reflect:
  - *Record*: re-renders, scene edits, chat edits, clip swaps, caption downloads and share-enables all land in `UsageRecord` (generations already did via quota).
  - *Recall*: `GET /api/me/defaults` learns the user's most-used style/aspect/voice from their own videos; the AI Studio opens pre-set to it. **The platform remembers how each user works.**
  - *Reflect*: `GET /api/admin/product-insights` — failure rate, re-render rate, hand-edit volume, style demand, unit cost. The numbers that say what to fix next, and the labelled usage dataset a future model for this platform trains on.
  - Verified against the real DB: events land, defaults learned (`modern`/`16:9` from real videos), insights count generations/re-renders/edits and expose $0.006917/gen.
- **Share pages**: `/v/[videoId]` (server-rendered, real OG tags) + `POST /api/videos/[id]/share` toggle + Share button. **Opt-in per video** — never id-guessable. The free-tier watermark is now a growth channel.
- **Completion email**: pipeline sends "your video is ready" on COMPLETED (best-effort; SMTP optional).
- **Template → AI bridge**: "Generate with AI" on template cards prefills the AI Studio via query params; explicit params beat learned defaults.
- **Transition picker** (9 xfade types + hard cuts) and **4K** (`renderQuality: '4k'`, 3840×2160 / 2160×3840 / 2160², **Pro-plan gated server-side**). Draft/full/4K select in the Studio. Dims verified.
- **Provider-blocked, deliberately NOT built**: AI avatars and voice cloning need external providers (HeyGen-class / ElevenLabs voice-add) with keys this environment doesn't have — stubbing them would violate the fail-visibly rule. Team-collaboration polish deferred (Socket.IO server exists).
- ⚠ Lesson: the scratch-Postgres port (55432) collided with another Claude session's scratch server (SHAREDRIVER BOT); the later e2e runs transparently used that instance. Results remain valid (same PG 18, own database, dropped afterwards) — but future runs should pick a random high port.

---

**2026-07-10 — a real advert, then the real-estate vertical. Six defects, several silent.**
Writing actual customer videos found more than a week of testing did.
- **The voiceover read its own stage directions.** `description` served three masters: prose for the editor, the words SPOKEN, and the caption text. A coffee commercial narrated *"Close-up of coffee beans pouring into a grinder."* Added `narration` alongside `description` and `searchQuery`. Verified by Whisper-transcribing the render.
- **`duration` was a lie whenever voiceover was on.** Scenes were cut to speech, so a 25s advert rendered 12.9s. Speech is now a FLOOR, never a ceiling. That alone desynced the voice (segments were concatenated back-to-back), so `buildAlignedNarration()` delays each line to its own scene's start and pads the track — silence falls BETWEEN lines instead of the script sliding early.
- **THE WEB APP HAD NEVER RENDERED A CROSS-FADE.** `@ffmpeg-installer` was in webpack's externals but **`ffmpeg-static` was not**, so inside the Next server bundle its `path.join(__dirname, ...)` resolved nowhere and `lib/ffmpeg-env` fell silently through to the pinned **2018 build** — no `xfade` (4.3), no `adelay:all` (4.2). Every UI render used hard cuts; every test suite passed, because plain node resolves ffmpeg-static correctly. Fixed by externalising it; the fallback now logs a loud warning.
- **Captions failed silently above 25MB** (Whisper's limit) against a 50MB narration cap. `compressForWhisper()` downmixes to 16 kHz mono before sending.
- **An estate agent's ad ended by speaking a stage direction.** GPT appended an end-card with EMPTY narration, so `spokenLine()` fell back to the description. `dropSilentScenes()` prunes it and the planner is forbidden from inventing cards. Legacy plans (no narration anywhere) still speak their descriptions.
- **There was no way to upload a photo.** The pipeline could always USE a user's media, but `POST /api/media` only *records a url you already host*. `POST /api/media/upload` is the front door: multipart, order preserved, returns `mediaAssetIds`.

**2026-07-10 — REAL ESTATE VERTICAL: the three gaps closed.**
- **Caption contrast.** White text + 2px outline is invisible over a white kitchen. `buildCaptionFilter` now draws a scrim (`box=1:boxcolor=black@0.55:boxborderw=6`), line spacing widened so per-line boxes never overlap and compound their alpha. `boxOpacity: 0` restores the old look. Measured, not eyeballed: white text on a WHITE frame reads **YAVG 158.8 vs a control of 255.0** — 96 levels of separation. (A full-width band was the wrong ruler: the box only spans the text, so margins washed it out to 245.)
- **Scene-count matching.** The planner asked 6 scenes against 5 photos, so a listing ended on a stranger's kitchen. `clampScenesToMedia()` trims the plan to the assets *before* durations are normalised, behind a `mediaOnly` flag. Live: 5 photos -> **5 scenes, 0 stock**, and the video lands on **exactly 20.00s** instead of 24.7s — clamping fixed the slot overrun as a side effect.
- **Bulk import.** `lib/listing-brief.ts` (pure, offline-tested) parses the agent's CSV: RFC-4180 quoted fields so `"$685,000"` survives its comma, photo urls split on space/semicolon/pipe, column aliases across CRMs, malformed rows rejected LOUDLY. `listingPrompt()` states only supplied facts and forbids inventing rooms or prices — agents are legally accountable for their listings.
- `POST /api/listings/batch`: CSV or JSON, <=25 listings, per-listing quota, photos pulled through the SSRF guard into owned MediaAssets, `mediaOnly: true`, one video per row; a failing row is reported by ref and doesn't take the batch down.
- Proven live: a two-row CSV -> two videos, **4 scenes / 4 photos / 0 stock** each, narrating only supplied facts. Loopback photo urls were correctly REFUSED by the SSRF guard and reported per-row.
- Remaining for a first paying agent: nothing blocking. Nice-to-have: lower-third templates (price/beds burned in), MLS feed ingestion, and a licensed music bed.

**2026-07-10 — lower thirds, MLS feeds, a real music bed, and the loop that learns.**
- **Lower thirds** (`lib/lower-third.ts`): address + "$685,000 · 4 bed · 2 bath" on a scrim with a brand-coloured accent bar, held for the opening seconds. Text is escaped and colours hex-validated — `O'Brien: Ave` would otherwise rewrite the filtergraph. Proven by rendering onto a white clip: block dark while shown, frame back to 255.0 once it leaves. Wired into `/api/ai` and set automatically for every listing in `/api/listings/batch`.
- **MLS / portal feeds** (`lib/mls-feed.ts`): RESO Web API JSON (`value[]`, PascalCase, `Media[].MediaURL`) and generic portal XML, with case-insensitive aliases across CRMs, money formatting, and content-type sniffing. `POST /api/listings/batch { feedUrl }` fetches it through the SSRF guard. Malformed feeds are rejected by name; **only `http(s)` photo urls survive parsing** (a feed cannot smuggle `file:///etc/passwd` into the renderer). 18 offline assertions.
- **MUSIC — and three real bugs it uncovered.** I cannot license a track and will not commit audio of uncertain provenance, so `npm run music:beds` **synthesizes original beds from sine tones** (nobody owns a sine wave). Getting them audible exposed:
  1. **The ducking never ducked.** `sidechaincompress` needs `level_sc`; a narration at -35 dBFS sat far below `threshold=0.05` and triggered nothing. The 4 dB "duck" the project believed in for months was an `amix` artefact. `level_sc=4` gives a real voice a **13.3 dB duck**.
  2. **`amix` lacked `normalize=0`** — 6 dB off every stem, silently.
  3. **The test measured the wrong thing**: total loudness, where the voice masks the music. It now band-passes the music's own tone.
  Live result: the bed went from -42 dB in the gaps (inaudible) to **-18…-29 dB** (audible), ducked under speech. `loudnorm` was tried in the live mix and removed — its multi-second lookahead desyncs the music from the sidechain key.
- **The product loop, examined and closed.** Memory existed (`computeUserDefaults` learns style/aspect/voice from the last 20 videos; `getProductInsights` for admin) but the strongest signal was thrown away: **"Swap clip" recorded `{videoId, sceneId}` and not WHICH clip or for WHAT query.** `lib/clip-memory.ts` now remembers both, seeds the stock search's exclusion set with everything a user has rejected, and exposes `rejectionRate()` — the product's own quality score. Verified against the live database.
- **Claude skills refreshed**: `verify-forgevid` rewritten around the real `verify:*` suites and a mandatory "drive the browser" stage; new `render-pipeline` skill documenting the three-way split of scene text and every ffmpeg footgun that has fired here; `CLAUDE.md` rewritten with the traps.
- Gates: type-check, verify:generate (241), verify:site, verify:proxy, verify:export, verify:e2e:db, build with every key unset.

**2026-07-10 — the BullMQ queue path VERIFIED for the first time.**
- Env confusion resolved: provider keys were already real in `dev/forgevid/.env.local`; `JWT_SECRET`+`ENCRYPTION_KEY` were stranded in the stale OneDrive copy, now transplanted. Cloudinary empty in BOTH. `REDIS_URL` set but nothing listening.
- Ran Redis via the compose file that already defined `forgevid-redis` (`npm run redis:up`); booted `npm run worker` (`listening on "video-generation"`, connected as a Redis client).
- Pushed a render: API returned `mode: queued, jobId: 1` (not inline). The **separate worker process** rendered it (`[worker] completed 1`); the web server logged **zero** assembly lines. Queue drained, 10.00s output on disk. First execution ever of this path.
- Still open: Cloudinary unconfigured (local disk), Docker image never run.

**2026-07-10 — MARKETING VERTICAL: the ad-variation engine.**
- Research (2026 performance marketing) is unambiguous: the bottleneck is creative VOLUME against ad fatigue — cold creative burns out in 10-14 days, top teams test 20-50 variants/month, the framework is the 3x2x2 matrix (3 hooks x 2 lengths x 2 CTAs), and the hook drives ~70% of performance. Underserved for SMBs; a perfect fit for ForgeVid's editable-scene architecture + the queue.
- `POST /api/campaigns/variations`: one concept -> a matrix of ad creatives. The body is planned ONCE (`presetScenes`) and reused, so each variant changes exactly one axis (hook / CTA / placement) — a valid A/B test, not N unrelated videos. `lib/ad-variations.ts` expands the matrix (pure, 12 offline assertions incl. the 24-variant cap and the single-scene hook+CTA conflict). Each variant is quota-checked and queued individually with a readable label ("hook:urgency · 9:16 · cta:signup").
- New generation seams: `presetScenes` (skip planning, reuse a body), `hookNarration`/`hookSearchQuery` (swap the opening line AND its footage), `ctaNarration` (swap the close).
- **Proven live through the queue**: one concept -> 4 variants (2 hooks x 2 placements), all rendered by the WORKER (web process rendered 0). All four share the identical 3-scene body; only the hook line ("Drowning in sticky notes?" vs "Finish work an hour early.") and shape (960x540 vs 540x960) differ. Frames confirm the hook footage differs too.
- **Ops lesson**: the first live run re-planned every variant — the WORKER had been booted before the feature existed and `tsx` does not hot-reload. The Redis payload carried `presetScenes` correctly; the stale worker ignored it. Restart the worker on lib changes (now in CLAUDE.md).

**2026-07-10 — AUTOMOTIVE + E-COMMERCE verticals (then verticals FREEZE).**
- Both built on a shared, deduped feed engine. `lib/feed-core.ts` holds the parsing machinery (JSON + XML dispatch, the record-array finder, case/separator-insensitive alias lookup, `pickAll` for photos split across fields, money/count/mileage coercion, http-only photo extraction). `mls-feed.ts` was refactored onto it with **all 18 real-estate tests still green** — no drift.
- `lib/feed-batch.ts`: the shared per-item loop (quota, SSRF-guarded photo import, mediaOnly generation, lower third, per-item error isolation). All three verticals' routes are now thin.
- **Automotive** (`lib/vehicle-feed.ts`, `POST /api/vehicles/batch`): DMS inventory feed (JSON/XML) or inline array → one video per car with **title + price · miles · year** burned in. Composes "2022 Toyota RAV4 XLE" from parts when there's no title field; formats mileage (mi/km); aliases for vAuto/Dealer.com/HomeNet-style fields (StockNumber/VIN/Odometer/SellingPrice). Fact-only prompt forbids inventing options, mileage, price or warranty.
- **E-commerce** (`lib/product-feed.ts`, `POST /api/products/batch`): Google Merchant RSS (the `g:` namespace) and Shopify/generic JSON → one ad per SKU with **price · brand** burned in, defaulting to 9:16 for social. Strips HTML from `body_html`; gathers photos across `image_link` + `additional_image_link`. Feeds straight into the ad-variation engine for hook/placement testing.
- **Proven live through the queue**: a vehicle feed → 960x540 dealership video, 2/2 own photos, lower third "2022 Toyota RAV4 XLE · $28,900 · 24,000 mi · 2022", Whisper heard "Presenting the 2022 Toyota RAV4 XLE with just 24,000 miles on the odometer." A product feed → 540x960 ad, 2/2 own photos, "Wireless Earbuds Pro · $49.00 · Acme Audio", "Introducing the Wireless Earbuds Pro. Experience crisp, immersive sound." Both fact-only, zero stock.
- **Every feed refuses to smuggle a non-http photo url into the renderer** (tested), rejects malformed feeds by name, and pulls photos through the SSRF guard.
- Gates: type-check, verify:generate (277 assertions), verify:site, verify:proxy, verify:export, verify:e2e:db, build with every key unset.
- **DECISION: verticals are now FROZEN.** Real estate, automotive, e-commerce, and the marketing ad-variation engine ship on one shared engine. No new verticals until the platform is tested and generating real income.

**2026-07-10 — BILINGUAL narration (English + Spanish), aimed at the Miami dealer.**
- A `language` option (`'en' | 'es'`) threads from `GenerationOptions` → `planScenes` (writes narration + captions in the target language; stock-search terms stay English) → `GenerationInput` / `generation-pipeline` → `FeedBatchOptions`. TTS needed no change: `eleven_multilingual_v2` already speaks the premade voices in Spanish, and Whisper auto-detects the language for captions.
- `POST /api/vehicles/batch` gained `languages: ['en','es']` — one call renders every car in both languages, each consuming its own quota (the quota is the meter, so bilingual cost is already priced).
- NOT a new vertical — an option on the existing automotive one, so it respects the freeze; it's the key differentiator for the Miami lot.
- **Proven live**: `npx tsx scripts/verify-spanish.ts` renders the same RAV4 twice and asks Whisper (`verbose_json`) which language it actually HEARD. Spanish cut → detected `spanish` ("Presentamos el Toyota RAV4 XLE 2022 con solo 24,000 millas. Un solo dueño, historial limpio, tracción en las cuatro ruedas y cámara de reversa."); English cut → detected `english`. Anti-fabrication held in Spanish — only feed facts, numbers preserved.
- Gates: type-check exit 0, `verify:spanish` exit 0, `verify:generate` (277 assertions) still green.

**2026-07-12 — Feed → Videos UI (MVP): the verticals are now self-serve.**
- The four verticals were API-only — no way for a dealer to use them without someone hitting the endpoint. Added ONE shared screen (`app/dashboard/feed/page.tsx`, nav "Feed → Videos") covering automotive / real estate / e-commerce on the same form: pick vertical → paste a feed (or feed URL) → aspect ratio, duration, and an **EN/ES toggle** (automotive) → a batch of videos. Marketing variations stays advanced/API.
- Two input modes: Feed URL (public feeds; `localhost` is SSRF-blocked by design) and Paste JSON with a one-click sample using public photo URLs, so it's testable locally.
- CSRF/auth need no per-call wiring: `installCsrfFetch()` (global, in the session provider) auto-attaches `x-csrf-token` to same-origin fetches.
- **Verified end-to-end** on the local stack as `pro@forgevid.test`: POST returned `started:2` (EN+ES), photos imported from public URLs through the SSRF guard, and the worker rendered BOTH to COMPLETED (`[worker] job 12/13 done`). Page renders with zero console errors; `tsc --noEmit` exit 0.
- Not a new vertical — the UI that makes the existing ones sellable. Launch item (P1, elevated for the dealer deal).

## Phase 0 — Repo hygiene (do before any feature work)

- [ ] Commit or deliberately revert the working tree (510 uncommitted files, ~60 deleted status MDs).
  - _Accept:_ `git status --short` is empty; one real commit message describing the cleanup.
- [ ] Fix `npm run type-check` — missing type defs for `jsonwebtoken`, `node-fetch`, `triple-beam`, `uuid`.
  - Try clean `npm install` first; add `@types/*` only if still missing.
  - _Accept:_ `npm run type-check` exits 0.
- [ ] Remove the ~40 stale status/audit `*.md` files and loose `forgevid-*.html` test files from the repo root.
  - _Accept:_ root contains only real docs (README, this TODO, LICENSE, config).
- [ ] Check for tracked secrets before next push: `git ls-files | grep -i env`.
  - _Accept:_ no `.env*` with real values tracked.

---

## Phase 1 — Async generation pipeline (unblocks everything) [P0]

**Problem:** the whole multi-minute pipeline runs synchronously inside `POST /api/ai`
([app/api/ai/route.ts:136](app/api/ai/route.ts#L136)); the UI shows a fake progress bar
([app/dashboard/ai/page.tsx:52-60](app/dashboard/ai/page.tsx#L52-L60)).

- [ ] Delete the unreachable dead code in `app/api/ai/`: `runway.ts`, `upscale.ts`, `sdxl-animatediff.ts`, `image.ts`, `select.ts`, `queue.ts` (App Router only routes `route.ts`). Keep whatever logic is worth salvaging by moving it into `lib/`.
  - _Accept:_ no loose non-`route.ts` handlers left in `app/api/ai/`; build passes.
- [ ] Stand up a real BullMQ queue + a standalone worker process (BullMQ already a dependency; rewrite the demo `video-worker.js`).
  - _Accept:_ enqueuing a job runs it in the worker, not the web request.
- [ ] Move `generateVideoFromPrompt` off the request thread — `POST /api/ai` enqueues a job and returns a `jobId` immediately.
  - _Accept:_ the POST returns in <1s with a job id.
- [ ] Add `GET /api/ai/jobs/[id]` status endpoint (state + real percent + result URL/error).
  - _Accept:_ client can poll and see QUEUED → PROCESSING → READY/FAILED.
- [ ] Emit real progress from the pipeline stages (script, scenes, downloads, assembly, upload) into the job.
  - _Accept:_ progress bar in the UI reflects actual stage, not a timer.
- [ ] Replace the fake `setInterval` progress in [app/dashboard/ai/page.tsx](app/dashboard/ai/page.tsx) with polling of the status endpoint.
  - _Accept:_ bar advances from server events; survives page refresh.
- [ ] Worker concurrency limit + graceful shutdown so FFmpeg doesn't pile up.
  - _Accept:_ N concurrent generations never exceed the configured worker concurrency.

---

## Phase 2 — Persist generations as real Videos [P0]

**Problem:** generation writes an `AIGeneration` row but never a `Video`; `POST /api/videos` returns 501
([app/api/videos/route.ts:75](app/api/videos/route.ts#L75)).

- [ ] Create a `Video` record at job enqueue with status transitions (add `QUEUED`/`FAILED` to `VideoStatus` if missing).
  - _Accept:_ every generation appears in "My Videos" immediately with a live status.
- [ ] On success, store the final Cloudinary URL, duration, resolution, thumbnail on the `Video`.
  - _Accept:_ generated video is downloadable after the 24h temp cleanup.
- [ ] Implement `POST /api/videos` (currently 501) or remove it and document the generation entrypoint.
  - _Accept:_ no route returns 501 in the happy path.
- [ ] Generate + store a thumbnail (FFmpeg frame grab) for the grid.
  - _Accept:_ "My Videos" shows a real thumbnail, not a placeholder.

---

## Phase 3 — Scene-based post-editing (InVideo signature) [P0]

**Problem:** the pipeline computes a scene list then bakes a flat MP4 and discards it; the
dnd-kit timeline ([components/timeline.tsx](components/timeline.tsx)) is disconnected from generation.

- [ ] Persist the scene list to the project `metadata`: per scene = script line, keywords, chosen clip URL, duration, voiceover segment, caption.
  - _Accept:_ a generated project reloads with its full scene structure.
- [ ] Load the persisted scenes into the timeline editor as tracks/clips.
  - _Accept:_ opening a generated video in the editor shows its scenes, not an empty timeline.
- [ ] Per-scene "swap clip" — re-search Pexels for that scene and replace the clip.
  - _Accept:_ swapping one scene doesn't touch the others.
- [ ] Per-scene "regenerate" — re-run script→footage→voiceover for a single scene.
  - _Accept:_ a single scene re-renders and the project re-assembles.
- [ ] Re-render the project from the edited scene list (feeds Phase 4 renderer).
  - _Accept:_ edited scenes produce a new final MP4.

---

## Phase 4 — Fix / replace the timeline renderer [P0]

**Problem:** [lib/video-export.ts:138-150](lib/video-export.ts#L138-L150) treats `clip.assetId` as a
local path and `fs.existsSync`-skips Cloudinary URLs; the complex filter builds `[v00]` labels that are
never concatenated/overlaid/mapped; text tracks ignored; no transitions. `lib/video-processing.ts` is a mock.

- [ ] **Decision first:** hand-rolled FFmpeg graph vs. Remotion vs. API renderer (Shotstack/Creatomate). Record the choice + rationale here.
  - _Accept:_ decision documented before renderer code is written.
- [ ] Download/cache remote (Cloudinary/Pexels) assets to a temp dir before FFmpeg.
  - _Accept:_ a timeline of URL-based clips renders (no silent skips).
- [ ] Build a correct filter graph: trim → scale/pad → xfade/concat → drawtext/subtitles → amix (with ducking).
  - _Accept:_ output actually contains every clip, in order, with audio.
- [ ] Render text/caption tracks (currently ignored).
  - _Accept:_ text clips appear in the output.
- [ ] Replace the `lib/video-processing.ts` mock (`processVideo` returns `example.com/processed-video.mp4`).
  - _Accept:_ no mock URLs returned from real endpoints.
- [ ] Remove placeholder fallbacks that ship third-party sample videos to users (see Phase 8).

---

## Phase 5 — Audio, captions, voice, aspect ratio [P0]

### Background music
- [ ] Add a licensed music library (20–50 tracks) with mood metadata.
  - _Accept:_ tracks exist with license records.
- [ ] Wire mood-based selection to the emotion-ai output (`musicTracks` names currently map to nothing).
  - _Accept:_ detected emotion selects a real track.
- [ ] Audio ducking: lower music under the voiceover (FFmpeg `sidechaincompress` / volume automation).
  - _Accept:_ narration is audible over music in the output.

### Real captions (not scene descriptions)
- [ ] Word-timed captions from the actual narration via Whisper (or ElevenLabs timestamps) — replace the drawtext-of-scene-description in [lib/video-generator.ts:160](lib/video-generator.ts#L160).
  - _Accept:_ captions match spoken words and timing.
- [ ] Styled caption presets (position, font, highlight).
  - _Accept:_ user can pick a caption style.
- [ ] SRT/VTT export.
  - _Accept:_ downloadable subtitle file matches the video.

### Voice selection
- [ ] Remove the hardcoded voice ID `ErXwobaYiN019PkySvjV` + deprecated `eleven_monolingual_v1` (two places: [lib/video-generator.ts:122](lib/video-generator.ts#L122), [app/api/ai/route.ts:27](app/api/ai/route.ts#L27)).
- [ ] Voice catalog + preview + selection in the generate UI; upgrade to `eleven_multilingual_v2` (OpenAI TTS as cheap tier).
  - _Accept:_ user picks a voice; it's used in the render.

### Aspect ratio
- [ ] Parameterize the hardcoded `1920:1080` scale/pad; support 16:9, 9:16, 1:1.
  - _Accept:_ generating in 9:16 produces a vertical video end-to-end (trim + assembly + captions).

---

## Phase 6 — Brand kit + free-tier watermark [P1]

- [ ] Brand kit: logo, colors, fonts, intro/outro stored per user/org.
  - _Accept:_ brand assets persist and apply to a render.
- [ ] Free-tier watermark tied to existing Stripe plan gating.
  - _Accept:_ free plan renders carry a watermark; paid plans don't.

---

## Phase 7 — Quality parity with InVideo [P1]

- [ ] Better footage matching: search the full scene phrase, score candidates, dedupe clips across scenes (currently one keyword at a time, random pick from top 3 in [lib/video-generator.ts:486-491](lib/video-generator.ts#L486-L491)).
  - _Accept:_ no repeated clip across scenes in a typical run.
- [ ] Transitions & motion: crossfades (`xfade`), Ken Burns on stills, animated text presets.
- [ ] User media in generations: let "use my product shots" pull from `MediaAsset`.
- [ ] Chat-based editing ("make scene 2 faster") operating on the Phase 3 scene structure (chat panel + `ai-editing` route are scaffolding today).
- [ ] Modernize or delete the Replicate path: Zeroscope v2 XL / that SVD version are 2023-era, 576p/8fps. Either integrate current-gen text-to-video (Kling/Wan/Veo/Runway) as a premium add-on, or delete ([lib/replicate-video.ts](lib/replicate-video.ts)).
- [ ] Rendering infra: confirm persistent VM/container target (not serverless — writes to `public/temp`/`public/generated`); add disk cleanup + concurrency limits. Docker setup already supports this.

---

## Phase 8 — Fail visibly, never ship placeholders [P0 correctness]

- [ ] Remove silent fallback to Google sample videos (`ForBiggerBlazes.mp4`) at [lib/replicate-video.ts:164](lib/replicate-video.ts#L164) and the Pexels fallback in [lib/video-generator.ts:240](lib/video-generator.ts#L240).
  - _Accept:_ a failed generation surfaces an error to the user; no third-party demo video is ever returned as "your video."

---

## Phase 9 — Later [P2]

- [ ] AI avatars
- [ ] Voice cloning
- [ ] Multi-language generation
- [ ] Team collaboration polish (Socket.IO server exists)
- [ ] 4K export
- [ ] GIF export
- [ ] Template marketplace moderation flows

---

## Portfolio decision (blocking gate)

- [ ] **Decide whether ForgeVid earns build capacity.** Global rules put 100% on SHAREDRIVER BOT; ForgeVid isn't on the active list. Phases 1–5 (P0) are ~4–8 weeks of solo work. Make this call before starting Phase 1.

---

## Launch runbook — Tier 1 (code done → go live)

**2026-07-20 — Tier 1 code is finished and verified.** Production build compiles
green, `tsc` clean, password-reset flow verified end-to-end against the DB. What
remains is account/infra config only YOU can do (credentials, money, domain).
Every var below is documented in `.env.example`. Set [BOTH] vars identically on
the web app AND the worker.

### Code done this session (verified)
- [x] Production build green — fixed the legal pages that broke `next build`
      (client wrappers exported `metadata`); added the missing `/[locale]/refund`.
- [x] Self-service password reset — `/auth/forgot-password` + `/auth/reset-password`
      + endpoints; hashed single-use 1h token; round-trip verified on the DB.
- [x] Content moderation (prompt + image), quota refund on render failure,
      abuse reporting + audit log, Sentry, real ToS/Privacy/Refund pages + checkout
      consent, billing/analytics reconciled to real data. (earlier this session)

### 1. Provision services + collect credentials
- [ ] Managed **Postgres** (Neon/Supabase/RDS) → `DATABASE_URL`
- [ ] Managed **Redis** (Upstash) → `REDIS_URL`. *Strongly recommended:* without
      it, generation runs inline in the HTTP request and long renders time out.
- [ ] **Cloudinary** → `CLOUDINARY_*` + `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
      (finished videos already upload here).
- [ ] AI providers → `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `PEXELS_API_KEY`
      (`HEYGEN_API_KEY` only if you enable avatars).
- [ ] **Stripe** → create 3 recurring Prices, paste `STRIPE_STARTER/PRO/ENTERPRISE_PRICE_ID`;
      set `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- [ ] **Email** (SMTP or Resend/Postmark) → `SMTP_*`. Required for password reset
      + receipts.
- [ ] **Sentry** project → `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`.

### 2. Generate secrets
- [ ] `NEXTAUTH_SECRET`, `JWT_SECRET` = `openssl rand -base64 32` (different values)
- [ ] `ENCRYPTION_KEY` — **must be identical** on web + worker (decrypts stored keys)

### 3. Legal / company identity (fills the legal pages + consent line)
- [ ] `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_ADDRESS` (real address),
      the `*_EMAIL` set, `NEXT_PUBLIC_DMCA_EMAIL`, `NEXT_PUBLIC_GOVERNING_STATE`,
      `NEXT_PUBLIC_ARBITRATION_VENUE`, `NEXT_PUBLIC_LEGAL_UPDATED`.

### 4. Deploy
- [ ] Web app → host of choice; set all [WEB]/[BOTH] env vars.
- [ ] Worker → Render (`render.yaml`, `forgevid-worker`); set all [WORKER]/[BOTH]
      vars **matching** the web app's `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`,
      provider keys.
- [ ] Run `npx prisma migrate deploy` against the prod DB (release step).
- [ ] Register the Stripe webhook → `https://<domain>/api/webhooks/stripe` →
      paste `STRIPE_WEBHOOK_SECRET`.
- [ ] DNS → domain to the web host; set `NEXTAUTH_URL` to the exact prod URL.

### 5. First-run
- [ ] Create the first admin (`prisma/seed.ts` or promote a user's role to ADMIN).
- [ ] Beta gate: keep `BETA_MODE` on with `BETA_ALLOWED_EMAILS`/`BETA_INVITE_CODES`
      for a soft launch, or turn off for open signups.

### 6. Prod smoke test (do before sharing the URL)
- [ ] Sign up → create a feed/listing batch → a video finishes and plays.
- [ ] Checkout a plan (Stripe test mode first, then live) → webhook flips the plan.
- [ ] Password reset end-to-end (needs SMTP live).
- [ ] Submit an abuse report; try a disallowed prompt and confirm it's blocked.

### Open decision (verify before relying on the feed feature in prod)
- [ ] **Imported-image storage on a split deploy.** Finished videos go to
      Cloudinary (durable). But `lib/site-images.ts` writes imported feed/listing
      images to local `public/uploads/`. If the web app and worker run on
      different hosts with no shared disk, the worker can't read them. Either
      deploy web+worker with a shared volume, or move `importSiteImages` uploads
      to Cloudinary. (Tier-2 candidate; not a blocker for the product-URL/site
      flows that screenshot in-process.)
