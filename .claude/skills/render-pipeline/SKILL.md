---
name: render-pipeline
description: How ForgeVid's video renderer actually behaves - the ffmpeg/fluent-ffmpeg footguns, the three-way split of scene text (description vs narration vs searchQuery), audio mixing rules, and how to prove a render is correct. Use before touching lib/video-generator.ts, lib/captions.ts, lib/voiceover.ts, lib/transitions.ts or anything that emits a filtergraph.
---

# The render pipeline

```
planScenes(script, duration)   -> PlannedScene[]   GPT decomposes the script
resolveSceneClips(scenes)      -> ResolvedScene[]  Pexels / the user's media
assembleVideo(scenes, ...)     -> a public URL     ffmpeg
```

Scenes are persisted on `Video.metadata.scenes`, so they can be edited and
re-rendered without re-deriving them from the prompt. Anything you add to a scene
must survive that round trip.

## A scene's text does THREE different jobs. Keep them apart.

| Field | Who reads it | Never |
|---|---|---|
| `description` | the human editing the scene | spoken; searched |
| `narration` | the voice; the caption | describes the shot |
| `searchQuery` | the stock provider, verbatim | prose |

They were once one field, and it caused two of this project's worst bugs:

- a coffee advert whose voiceover said *"Close-up of coffee beans pouring into a
  grinder"* out loud, because the description was narrated;
- a query of *"Close-up of a person's smile watching finished"* which fetched a
  **lipstick advert**, because prose was sent to a stock search.

`spokenLine(scene)` falls back to `description` only for scenes planned before
`narration` existed. `dropSilentScenes()` prunes end-cards the model invents with
nothing to say — otherwise the fallback speaks their stage direction aloud.

## ffmpeg footguns, all of which have fired here

**fluent-ffmpeg splits an `outputOptions` array entry containing exactly one
space** (`custom.js`, `split.length === 2`). A two-word caption tore the `-vf`
value in half. Pass filter graphs to `.videoFilters()` or `.complexFilter()`.

**`ffmpeg-static` must stay in `next.config.mjs` webpack externals.** Bundled,
its `path.join(__dirname, …)` resolves nowhere, the binary check fails, and
`lib/ffmpeg-env.ts` falls silently through to a **2018 build** with no `xfade`
(4.3) and no `adelay:all` (4.2). Every render through the UI loses its
cross-fades; the suites, which run under plain node, resolve correctly and pass.

**`-shortest` never terminates against `apad` coming out of a `filter_complex`.**
Bound the output with `-t`.

**`sidechaincompress` stops when its *sidechain key* ends** — which killed the
music the instant narration stopped. `apad` the key.

**`sidechaincompress` also needs `level_sc`.** With the default, a narration
below the threshold ducks nothing at all, and the "ducking" this project believed
it had for months was an `amix` artefact. `level_sc=4` gives a real voice a ~14 dB
duck.

**`amix` needs `normalize=0`**, or it divides every input by the input count and
silently takes 6 dB off every stem.

**`adelay=0:all=1` fails on old builds.** Force stereo and use `adelay=<ms>|<ms>`.

**`loudnorm` has a multi-second lookahead.** Never put it in a live mix upstream
of a sidechain — it delays the music relative to the key and lands the duck in
the wrong place. Normalise at bake time instead.

**`drawtext` needs an explicit `fontfile`** (a slim container ships none), and
`enable='between(t\,a\,b)'` needs its commas escaped. Windows paths need `C\:`.

**`xfade` overlaps clips**, so the output is short by `(n-1) × duration` unless
each clip but the last is padded. That desyncs narration.

**`zoompan`'s `d` is in FRAMES**, not seconds, and needs 2× supersampling to
avoid stair-stepping.

## Timing contract

- The requested `duration` is a **promise**. Speech is a **floor**, never a
  ceiling: `max(pacedDuration(segment), scene.duration)`. A 25-second advert whose
  copy runs 13 seconds is still 25 seconds long.
- Narration is laid out with `buildAlignedNarration()`, which delays each line to
  its own scene's start. Concatenating segments back-to-back makes line two play
  over shot one the moment any scene is longer than its line.
- `normalizeSceneDurations()` rescales the plan to the requested total, keeping
  the model's relative weighting, with a 1 s floor.

## Security inside the renderer

- **Never accept a URL from a client.** Resolve `MediaAsset` by id and check
  ownership. Any user-supplied URL goes through `lib/safe-fetch.ts`.
- **Everything reaching a filtergraph is escaped** (`escapeDrawText`) and every
  colour is hex-validated. An address like `O'Brien: Ave` would otherwise rewrite
  the graph.
- **Delete only files you created.** Track them explicitly (`{ path, downloaded }`);
  do not infer ownership by comparing a returned path to the input string. That
  inference once made the renderer delete the user's own uploads.

## Proving a render is correct

Metadata lies. Duration and codec were perfect on the video that opened with a
marble countertop.

1. **Look at the frames.** Extract stills at scene midpoints and view them.
2. **Transcribe the audio back** with Whisper and diff against the intended
   script. This is how "the voiceover reads stage directions" was caught.
3. **Measure the stem, not the mix.** Band-pass the frequency you care about;
   total loudness hides a ducked bed under the voice sitting on top of it.
4. **Prove overlays on a white clip.** Render the caption or lower third over
   solid white and measure the band's luminance against a control strip. White
   text with a 2 px outline is invisible over a white kitchen — which is most of
   a real-estate listing.
