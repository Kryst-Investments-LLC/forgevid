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

---

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
