/**
 * Runtime verification for the generation assembler (lib/video-generator.ts).
 *
 * Renders assembleVideo() against synthetic local clips — no Pexels, no OpenAI,
 * no ElevenLabs, no Cloudinary, no DB. Asserts that aspect ratio actually drives
 * the output frame size, that scene durations are honored, and that a caller's
 * local source files survive the assembler's temp cleanup.
 *
 *   npm run verify:generate
 */

import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  assembleVideo,
  aspectPreset,
  resolveSceneClips,
  type ResolvedScene,
  type AspectRatio,
} from '../lib/video-generator';
import {
  buildCaptionFilter,
  cuesToSrt,
  cuesToVtt,
  escapeFontPath,
  resolveCaptionFontFile,
  wrapText,
  buildWatermarkFilter,
  shiftCues,
  __resetFontCache,
  type CaptionCue,
} from '../lib/captions';
import { allowsCustomBranding, requiresWatermark, WATERMARK_TEXT } from '../lib/plan';
import { freeBranding, isValidHexColor, overlayPosition } from '../lib/brand-kit';
import {
  buildXfadeChain,
  clampTransitionDuration,
  paddedClipDurations,
  xfadeTotalDuration,
} from '../lib/transitions';
import { resolveFfmpegPath, supportsFilter } from '../lib/ffmpeg-env';
import { buildKenBurnsFilter, directionForScene } from '../lib/ken-burns';
import { hasOpenAiKey, openAiApiKey } from '../lib/openai-key';
import { applySceneOps, describeScenesForModel, sceneOpsSchema } from '../lib/scene-ops';
import { withRenderSlot, activeRenders, queuedRenders } from '../lib/render-semaphore';

const ffmpegPath: string = resolveFfmpegPath();
const workDir = path.join(process.cwd(), 'public', 'temp', 'verify-generate');

function ffmpeg(args: string[]) {
  execFileSync(ffmpegPath, ['-y', ...args], { stdio: 'pipe' });
}

function probe(file: string): string {
  try {
    execFileSync(ffmpegPath, ['-i', file], { stdio: 'pipe' });
    return '';
  } catch (err: any) {
    return String(err.stderr ?? '');
  }
}

function durationSeconds(out: string): number {
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error('Could not parse duration');
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok  ${msg}`);
}

function scene(index: number, source: string, duration: number, description?: string): ResolvedScene {
  return {
    id: `scene-${index + 1}`,
    index,
    description: description ?? `Test scene ${index + 1}`,
    keywords: ['test'],
    duration,
    visualElements: [],
    clipUrl: source,
    matchedQuery: 'test',
  };
}

/**
 * Regression: fluent-ffmpeg splits an outputOptions array entry containing
 * EXACTLY ONE space. A two-word caption made the whole -vf value one-space, so
 * the drawtext filter was torn in half and ffmpeg failed. Captions with >=2
 * spaces happened to survive, which is why this hid for so long.
 */
async function checkTwoWordCaption(source: string) {
  console.log('\nRendering with a TWO-WORD caption (one-space filter regression)...');
  const { videoUrl: url } = await assembleVideo([scene(0, source, 2, 'Opening shot')], ['subtitles'], '16:9');
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), 'two-word caption rendered (filter not torn in half)');
  fs.unlinkSync(outFile);
}

async function renderAndCheck(aspectRatio: AspectRatio, sources: string[]) {
  const { width, height } = aspectPreset(aspectRatio);
  console.log(`\nRendering ${aspectRatio} (expect ${width}x${height})...`);

  // addOns=['subtitles'] => captions on, voiceover off (no ElevenLabs key needed).
  const { videoUrl: url, thumbnailUrl } = await assembleVideo(
    [scene(0, sources[0], 2), scene(1, sources[1], 2)],
    ['subtitles'],
    aspectRatio,
  );

  // Cloudinary is unconfigured, so we get a local /generated/<file> URL.
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), `${aspectRatio}: output rendered`);

  // A poster frame must be extracted before the render is uploaded/deleted.
  assert(!!thumbnailUrl, `${aspectRatio}: thumbnail extracted`);
  const thumbFile = path.join(process.cwd(), 'public', 'generated', path.basename(thumbnailUrl!));
  assert(fs.existsSync(thumbFile) && fs.statSync(thumbFile).size > 500, `${aspectRatio}: thumbnail file is a real image`);
  fs.unlinkSync(thumbFile);

  const info = probe(outFile);
  assert(new RegExp(`${width}x${height}`).test(info), `${aspectRatio}: frame is ${width}x${height}`);
  const dur = durationSeconds(info);
  assert(Math.abs(dur - 4) < 0.6, `${aspectRatio}: duration ~4s (got ${dur.toFixed(2)}s)`);

  fs.unlinkSync(outFile);
}

/**
 * Mean volume (dB) of a time window of `file`, via ffmpeg's volumedetect.
 * volumedetect exits 0, so read stderr from spawnSync rather than a thrown error.
 */
function meanVolumeDb(file: string, start: number, duration: number): number {
  const res = spawnSync(
    ffmpegPath,
    [
      '-nostdin',
      '-ss', String(start),
      '-t', String(duration),
      '-i', file,
      '-vn', // don't decode the video stream — we only want loudness
      '-af', 'volumedetect',
      '-f', 'null', '-',
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  const out = `${res.stderr ?? ''}`;
  const m = out.match(/mean_volume:\s*(-?[\d.]+|-inf) dB/);
  if (!m) {
    throw new Error(
      `Could not parse mean_volume from ${file} [${start}s +${duration}s]. ` +
        `status=${res.status} signal=${res.signal} error=${res.error?.message} ` +
        `stderrLen=${out.length}\ntail:\n${out.slice(-400)}`,
    );
  }
  // A fully silent window reports -inf; treat it as very quiet.
  return m[1] === '-inf' ? -100 : Number(m[1]);
}

/**
 * Music must duck under narration. The voiceover here is deliberately quiet
 * (above sidechaincompress's threshold, but contributing little to the mix), so
 * a loudness drop while it plays can only come from the music being ducked.
 */
async function checkMusicDucking(clip: string) {
  console.log('\nChecking music ducking under narration...');
  const music = path.join(workDir, 'music.m4a');
  const voice = path.join(workDir, 'voice.m4a');

  // Music: loud, 6s. Voice: quiet, only the first 2s of a 4s video.
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=300:duration=6', '-c:a', 'aac', music]);
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=800:duration=2', '-af', 'volume=0.2', '-c:a', 'aac', voice]);

  const { videoUrl: url } = await assembleVideo([scene(0, clip, 4)], ['subtitles'], '16:9', {
    musicPath: music,
    voiceoverPath: voice,
  });
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), 'music+voiceover render produced output');

  const info = probe(outFile);
  assert(/Stream .*Audio: aac/.test(info), 'output has an audio stream');

  const duringNarration = meanVolumeDb(outFile, 0.2, 1.5); // voice playing -> music ducked
  const afterNarration = meanVolumeDb(outFile, 2.6, 1.2); // voice gone -> music recovers
  console.log(`      during narration: ${duringNarration} dB, after: ${afterNarration} dB`);
  // Regression: sidechaincompress ends when its key input ends, which used to
  // kill the music the instant narration stopped (audio ended at 2s, not 4s).
  assert(afterNarration > -90, 'music still plays after narration ends (sidechain key is padded)');
  assert(
    afterNarration > duringNarration + 1.5,
    `music is ducked while narration plays (${duringNarration}dB -> ${afterNarration}dB)`,
  );

  // The caller's music/voice files must survive cleanup.
  assert(fs.existsSync(music) && fs.existsSync(voice), 'injected music/voiceover not deleted');
  fs.unlinkSync(outFile);
}

/**
 * drawtext needs an explicit fontfile: a slim container (node:18-alpine) ships
 * no fonts, so relying on fontconfig's "Sans" family fails in production.
 */
function checkFontResolution() {
  console.log('\nChecking caption font resolution + filtergraph path escaping...');

  const font = resolveCaptionFontFile();
  assert(!!font && fs.existsSync(font), `a caption font was resolved (${font})`);

  // `:` separates filter options, so a Windows drive letter must be escaped.
  assert(
    escapeFontPath('C:\\Windows\\Fonts\\arial.ttf') === 'C\\:/Windows/Fonts/arial.ttf',
    'escapeFontPath: backslashes -> slashes, colon escaped',
  );

  const filter = buildCaptionFilter([{ start: 0, end: 1, text: 'hi' }]);
  assert(filter.includes('fontfile='), 'buildCaptionFilter pins an explicit fontfile');

  // An explicit CAPTION_FONT_FILE must win over the probed system paths.
  const previous = process.env.CAPTION_FONT_FILE;
  process.env.CAPTION_FONT_FILE = font!;
  __resetFontCache();
  assert(resolveCaptionFontFile() === font, 'CAPTION_FONT_FILE override is honoured');
  if (previous === undefined) delete process.env.CAPTION_FONT_FILE;
  else process.env.CAPTION_FONT_FILE = previous;
  __resetFontCache();
}

/** SRT/VTT serialisation is pure — assert the exact bytes. */
function checkCaptionFormats() {
  console.log('\nChecking SRT/VTT serialisation...');
  const cues: CaptionCue[] = [
    { start: 0, end: 1.5, text: 'Hello there' },
    { start: 1.5, end: 3.25, text: 'Second line' },
  ];

  const srt = cuesToSrt(cues);
  assert(
    srt.startsWith('1\n00:00:00,000 --> 00:00:01,500\nHello there'),
    'SRT: index, comma-separated ms, text',
  );
  assert(srt.includes('2\n00:00:01,500 --> 00:00:03,250\nSecond line'), 'SRT: second cue');

  const vtt = cuesToVtt(cues);
  assert(vtt.startsWith('WEBVTT\n\n'), 'VTT: header');
  assert(vtt.includes('00:00:01.500 --> 00:00:03.250'), 'VTT: dot-separated ms');

  const wrapped = wrapText('one two three four five six seven', 12);
  assert(wrapped.length > 1 && wrapped.every((l) => l.length <= 12), 'wrapText respects max width');
}

/**
 * Captions must survive ffmpeg's filtergraph escaping. A comma separates
 * filters, a colon separates filter options, `%` starts strftime expansion,
 * and an apostrophe would close the quoted text — all in one caption here.
 */
async function checkCaptionEscaping(clip: string) {
  console.log('\nBurning a caption with , : \' and % ...');
  const cues: CaptionCue[] = [
    { start: 0, end: 2, text: "He said: go, now — it's 50% done" },
  ];
  const { videoUrl: url } = await assembleVideo([scene(0, clip, 2)], ['subtitles'], '16:9', {
    cues,
  });
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), 'caption with special characters rendered');
  const dur = durationSeconds(probe(outFile));
  assert(Math.abs(dur - 2) < 0.5, `escaped-caption video duration ~2s (got ${dur.toFixed(2)}s)`);
  fs.unlinkSync(outFile);
}

/**
 * xfade OVERLAPS clips. Chained naively, N scenes lose (N-1)*D seconds — the
 * narration (fixed length) would then run past the video and every caption
 * would land late. Padding each clip but the last by D keeps the total exact.
 */
function checkTransitionMath() {
  console.log('\nChecking transition duration math...');
  const scenes = [2, 2, 2];
  const D = 0.5;

  assert(clampTransitionDuration(D, [2]) === 0, 'single scene => no transition');
  assert(clampTransitionDuration(5, [2, 2]) === 1, 'clamped to half the shortest scene');
  assert(clampTransitionDuration(0.05, [2, 2]) === 0, 'sub-100ms transition is treated as a cut');

  const padded = paddedClipDurations(scenes, D);
  assert(
    padded[0] === 2.5 && padded[1] === 2.5 && padded[2] === 2,
    'every clip but the last is padded by the transition duration',
  );
  assert(
    xfadeTotalDuration(padded, D) === 6,
    'padded chain preserves total duration (6s, not 5s)',
  );
  // The naive version is exactly the bug this guards against.
  assert(xfadeTotalDuration(scenes, D) === 5, 'unpadded chain would LOSE 1s (the bug)');

  const chain = buildXfadeChain(padded, { type: 'fade', duration: D });
  assert(chain.filters.length === 2, '3 clips => 2 xfade statements');
  assert(chain.filters[0].includes('offset=2.000'), 'first fade starts at the first scene boundary');
  assert(chain.outputLabel === 'vxout', 'chain terminates in a mappable label');
}

/**
 * ffmpeg capability probing. @ffmpeg-installer pins a 2018 build with no xfade
 * (ffmpeg >= 4.3), so transitions must degrade rather than blow up the render.
 */
function checkFfmpegCapabilities(): boolean {
  console.log('\nChecking ffmpeg capabilities...');
  const bin = resolveFfmpegPath();
  assert(!!bin, `resolved an ffmpeg binary (${bin})`);
  assert(supportsFilter('drawtext'), 'capability probe finds a filter that exists (drawtext)');
  assert(!supportsFilter('definitely_not_a_real_filter'), 'capability probe rejects a fake filter');

  const hasXfade = supportsFilter('xfade');
  console.log(`      xfade supported: ${hasXfade}`);
  return hasXfade;
}

/** The duration invariant must hold whichever path ffmpeg takes. */
async function checkTransitionRender(clipA: string, clipB: string, hasXfade: boolean) {
  const scenes = [scene(0, clipA, 2), scene(1, clipB, 2), scene(2, clipA, 2)];
  const generated = path.join(process.cwd(), 'public', 'generated');

  console.log(
    hasXfade
      ? '\nRendering 3 scenes with cross-fades...'
      : '\nRendering 3 scenes; xfade unsupported, expecting a graceful fall back to cuts...',
  );
  const { videoUrl: url } = await assembleVideo(scenes, ['subtitles'], '16:9', {
    transition: { type: 'fade', duration: 0.5 },
  });
  const dur = durationSeconds(probe(path.join(generated, path.basename(url))));
  assert(
    Math.abs(dur - 6) < 0.4,
    hasXfade
      ? `cross-faded video keeps its 6s duration (got ${dur.toFixed(2)}s) — narration stays in sync`
      : `fell back to hard cuts and still rendered 6s (got ${dur.toFixed(2)}s)`,
  );
  fs.rmSync(generated, { recursive: true, force: true });

  console.log('Rendering the same scenes with transitions explicitly disabled...');
  const { videoUrl: cutUrl } = await assembleVideo(scenes, ['subtitles'], '16:9', {
    transition: null,
  });
  const cutDur = durationSeconds(probe(path.join(generated, path.basename(cutUrl))));
  assert(Math.abs(cutDur - 6) < 0.4, `hard-cut video is also 6s (got ${cutDur.toFixed(2)}s)`);
  fs.rmSync(generated, { recursive: true, force: true });
}

/**
 * Ken Burns. A still held for seconds reads as a broken video, so image scenes
 * get a slow zoom. zoompan's `d` is in FRAMES, not seconds — the classic bug.
 */
function checkKenBurnsFilter() {
  console.log('\nChecking Ken Burns filter construction...');
  const f = buildKenBurnsFilter({ width: 1920, height: 1080, fps: 30, durationSeconds: 2 });
  assert(f.includes('d=60'), 'zoompan duration is in frames (2s @ 30fps = 60)');
  assert(f.includes('s=1920x1080'), 'zoompan emits at the output size');
  assert(/scale=3840:2160/.test(f), 'supersamples before zooming (avoids stair-stepping)');
  assert(f.includes('setsar=1'), 'square pixels, so concat/xfade accept it');

  const out = buildKenBurnsFilter({ width: 640, height: 360, fps: 25, durationSeconds: 4, direction: 'out' });
  assert(out.includes('d=100'), 'frames scale with fps (4s @ 25fps = 100)');
  assert(directionForScene(0) === 'in' && directionForScene(1) === 'out', 'direction alternates');
}

/** And a still must actually render as a moving clip of the right shape. */
async function checkKenBurnsRender() {
  console.log('\nRendering a still scene with Ken Burns...');
  assert(supportsFilter('zoompan'), 'ffmpeg has zoompan');

  const photo = path.join(workDir, 'photo.jpg');
  ffmpeg(['-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=1', '-frames:v', '1', photo]);

  const still: ResolvedScene = { ...scene(0, photo, 3), mediaType: 'image' };
  const { videoUrl: url } = await assembleVideo([still], ['subtitles'], '16:9', { transition: null });

  const generated = path.join(process.cwd(), 'public', 'generated');
  const outFile = path.join(generated, path.basename(url));
  const info = probe(outFile);
  const dur = durationSeconds(info);
  assert(Math.abs(dur - 3) < 0.4, `still rendered for its full 3s (got ${dur.toFixed(2)}s)`);
  assert(/1920x1080/.test(info), 'still scaled to the 16:9 frame');
  assert(/Video: h264/.test(info), 'still became a real video stream');

  // Duration and codec would also pass for a static hold. Prove it MOVES:
  // extract an early and a late frame; a zooming image renders them differently.
  const early = path.join(workDir, 'kb_early.png');
  const late = path.join(workDir, 'kb_late.png');
  ffmpeg(['-ss', '0.2', '-i', outFile, '-frames:v', '1', early]);
  ffmpeg(['-ss', '2.6', '-i', outFile, '-frames:v', '1', late]);
  const differs = !fs.readFileSync(early).equals(fs.readFileSync(late));
  assert(differs, 'first and last frames differ — the image is actually zooming');
  fs.unlinkSync(early);
  fs.unlinkSync(late);

  fs.rmSync(generated, { recursive: true, force: true });
  assert(fs.existsSync(photo), 'source photo not deleted by cleanup');
}

/**
 * The codebase read two different OpenAI env vars. .env.example only listed
 * OPENAI_API_KEY, so anyone following it got silently dead feature modules.
 * Both names must work, with the canonical one winning.
 */
function checkOpenAiKeyAlias() {
  console.log('\nChecking OpenAI env var alias...');
  const api = process.env.OPENAI_API_KEY;
  const secret = process.env.OPENAI_SECRET_KEY;

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_SECRET_KEY;
  assert(!hasOpenAiKey(), 'no key set => hasOpenAiKey() is false');

  process.env.OPENAI_SECRET_KEY = 'sk-legacy';
  assert(openAiApiKey() === 'sk-legacy', 'legacy OPENAI_SECRET_KEY is still honoured');

  process.env.OPENAI_API_KEY = 'sk-canonical';
  assert(openAiApiKey() === 'sk-canonical', 'OPENAI_API_KEY wins when both are set');

  if (api === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = api;
  if (secret === undefined) delete process.env.OPENAI_SECRET_KEY;
  else process.env.OPENAI_SECRET_KEY = secret;
}

/**
 * "Use my product shots". The user's own media fills scenes in order, and stock
 * is only needed for what's left — so a fully-covered generation must NOT
 * require a Pexels key. Runs with PEXELS_API_KEY unset, which is the whole point.
 */
async function checkUserMedia(clipA: string, clipB: string) {
  console.log('\nChecking user media in generations...');
  const pexels = process.env.PEXELS_API_KEY;
  delete process.env.PEXELS_API_KEY;

  try {
    const planned = [
      { id: 'scene-1', index: 0, description: 'Product hero', keywords: ['x'], duration: 2, visualElements: [] },
      { id: 'scene-2', index: 1, description: 'Product detail', keywords: ['y'], duration: 2, visualElements: [] },
    ];
    const userMedia = [
      { url: clipA, mediaType: 'video' as const, name: 'hero.mp4' },
      { url: clipB, mediaType: 'video' as const, name: 'detail.mp4' },
    ];

    const resolved = await resolveSceneClips(planned, '16:9', userMedia);
    assert(resolved.length === 2, 'both scenes resolved with no Pexels key');
    assert(resolved[0].clipUrl === clipA && resolved[1].clipUrl === clipB, 'user media fills scenes in order');
    assert(resolved[0].matchedQuery === 'hero.mp4', 'the asset name is recorded as the match');
    assert(resolved.every((s) => s.mediaType === 'video'), 'media type carried through');

    // One scene uncovered + no stock provider => must fail, and say why.
    let message = '';
    try {
      await resolveSceneClips(planned, '16:9', [userMedia[0]]);
    } catch (err: any) {
      message = err.message;
    }
    assert(/PEXELS_API_KEY/.test(message), 'uncovered scene without a stock key fails visibly');
    assert(/covers 1 of 2 scenes/.test(message), 'the error says how many scenes your media covered');

    // A still asset must be flagged so it gets Ken Burns, not a static hold.
    const stillResolved = await resolveSceneClips([planned[0]], '16:9', [
      { url: clipA, mediaType: 'image', name: 'shot.jpg' },
    ]);
    assert(stillResolved[0].mediaType === 'image', 'image assets are marked for Ken Burns');
  } finally {
    if (pexels === undefined) delete process.env.PEXELS_API_KEY;
    else process.env.PEXELS_API_KEY = pexels;
  }
}

/**
 * Chat-based scene editing. The model only proposes operations; validation and
 * application are ours. This is the boundary that keeps a hallucinated scene id
 * or a 900-second scene out of the database.
 */
function checkSceneOps(clip: string) {
  console.log('\nChecking chat-based scene editing (ops layer)...');
  const scenes: ResolvedScene[] = [scene(0, clip, 5), scene(1, clip, 5), scene(2, clip, 5)];

  // "make scene 2 faster"
  const faster = applySceneOps(scenes, [{ op: 'set_duration', sceneId: 'scene-2', duration: 2 }]);
  assert(faster.scenes[1].duration === 2, 'set_duration shortens the right scene');
  assert(faster.scenes[0].duration === 5, 'other scenes untouched');
  assert(faster.applied.length === 1 && faster.skipped.length === 0, 'operation applied');
  assert(scenes[1].duration === 5, 'applySceneOps is pure — the input list is not mutated');

  // A hallucinated scene id must be skipped, not applied.
  const bogus = applySceneOps(scenes, [{ op: 'set_duration', sceneId: 'scene-99', duration: 2 }]);
  assert(bogus.applied.length === 0 && bogus.skipped.length === 1, 'unknown scene id is skipped');
  assert(/No scene/.test(bogus.skipped[0].reason), 'and the reason is reported');

  // Deleting must reindex, or captions and user-media assignment desync.
  const deleted = applySceneOps(scenes, [{ op: 'delete_scene', sceneId: 'scene-2' }]);
  assert(deleted.scenes.length === 2, 'scene deleted');
  assert(deleted.scenes.map((s) => s.index).join(',') === '0,1', 'indexes stay dense after delete');
  assert(deleted.scenes[1].id === 'scene-3', 'ids stay stable (only index is reassigned)');

  // Never leave a video with zero scenes.
  const last = applySceneOps([scenes[0]], [{ op: 'delete_scene', sceneId: 'scene-1' }]);
  assert(last.scenes.length === 1 && last.applied.length === 0, 'cannot delete the last scene');
  assert(/at least one scene/.test(last.skipped[0].reason), 'and it says why');

  // swap_clip needs a network search, so the pure applier only reports it.
  const swap = applySceneOps(scenes, [{ op: 'swap_clip', sceneId: 'scene-3' }]);
  assert(swap.swapSceneIds.join() === 'scene-3', 'swap_clip is deferred to the caller');

  // The zod boundary is what a hallucinating model actually hits.
  assert(!sceneOpsSchema.safeParse({ operations: [{ op: 'drop_database' }] }).success, 'unknown op rejected');
  assert(
    !sceneOpsSchema.safeParse({ operations: [{ op: 'set_duration', sceneId: 's', duration: 900 }] }).success,
    '900-second scene rejected',
  );
  assert(
    !sceneOpsSchema.safeParse({ operations: [{ op: 'set_duration', sceneId: 's', duration: 0 }] }).success,
    'zero-second scene rejected',
  );
  assert(
    sceneOpsSchema.safeParse({ reply: 'ok', operations: [{ op: 'swap_clip', sceneId: 'scene-1' }] }).success,
    'a valid proposal passes',
  );

  // The model must never be shown clip urls.
  const digest = describeScenesForModel(scenes);
  assert(!digest.includes(clip), 'scene digest sent to the model contains no clip urls');
  assert(digest.includes('scene-2 (scene 2)'), 'digest labels scenes the way the prompt expects');
}

/**
 * Inline renders must be throttled: with no Redis, N clicks used to fork N
 * parallel multi-minute ffmpeg chains.
 */
async function checkRenderSemaphore() {
  console.log('\nChecking the inline render semaphore...');
  const prev = process.env.RENDER_CONCURRENCY;
  process.env.RENDER_CONCURRENCY = '2';

  let maxActive = 0;
  const order: number[] = [];
  const job = (i: number) =>
    withRenderSlot(async () => {
      order.push(i);
      maxActive = Math.max(maxActive, activeRenders());
      await new Promise((r) => setTimeout(r, 60));
    });

  await Promise.all([job(1), job(2), job(3), job(4), job(5)]);
  assert(maxActive === 2, `never more than 2 concurrent renders (saw ${maxActive})`);
  assert(activeRenders() === 0 && queuedRenders() === 0, 'all slots released afterwards');
  assert(order.join(',') === '1,2,3,4,5', 'FIFO — early requests are not starved');

  // A crashing job must still release its slot.
  await withRenderSlot(async () => {
    throw new Error('boom');
  }).catch(() => {});
  assert(activeRenders() === 0, 'a failed render releases its slot');

  if (prev === undefined) delete process.env.RENDER_CONCURRENCY;
  else process.env.RENDER_CONCURRENCY = prev;
}

/** The plan gate is what makes the watermark a business rule, not decoration. */
function checkPlanGate() {
  console.log('\nChecking plan gate...');
  assert(requiresWatermark('free'), 'free plan is watermarked');
  assert(!requiresWatermark('pro'), 'pro plan is not watermarked');
  assert(!allowsCustomBranding('free'), 'free plan cannot use custom branding');
  assert(allowsCustomBranding('enterprise'), 'enterprise plan can use custom branding');

  const free = freeBranding();
  assert(free.watermarkText === WATERMARK_TEXT && !free.logoUrl, 'freeBranding: watermark, no logo');

  // primaryColor is interpolated into a filtergraph — reject anything but hex.
  assert(isValidHexColor('#ff0000') && isValidHexColor('#f00'), 'hex colours accepted');
  assert(
    !isValidHexColor("red':x=0,drawtext=text='pwned") && !isValidHexColor('red'),
    'non-hex colour (filtergraph injection) rejected',
  );

  assert(overlayPosition('top-left', 24) === '24:24', 'overlay position: top-left');
  assert(overlayPosition('bottom-right', 24) === 'W-w-24:H-h-24', 'overlay position: bottom-right');
  assert(buildWatermarkFilter(WATERMARK_TEXT).includes('drawtext='), 'watermark builds a drawtext');
}

/**
 * Branding must actually reach the pixels: a free watermark, a logo overlay,
 * and intro/outro clips that lengthen the video AND shift caption timing.
 */
async function checkBrandingRender(clip: string) {
  console.log('\nRendering with watermark + logo + intro/outro...');
  const logo = path.join(workDir, 'logo.png');
  const intro = path.join(workDir, 'intro.mp4');
  const outro = path.join(workDir, 'outro.mp4');

  ffmpeg(['-f', 'lavfi', '-i', 'color=yellow:s=80x80', '-frames:v', '1', logo]);
  // Deliberately a different size to prove bookends are normalized before concat.
  ffmpeg(['-f', 'lavfi', '-i', 'color=white:s=320x240:r=24', '-t', '1', '-pix_fmt', 'yuv420p', intro]);
  ffmpeg(['-f', 'lavfi', '-i', 'color=gray:s=320x240:r=24', '-t', '1', '-pix_fmt', 'yuv420p', outro]);

  // Free plan branding, but with a logo/intro/outro attached, exercising every path.
  const branding = {
    ...freeBranding('free'),
    logoUrl: logo,
    logoOpacity: 0.8,
    logoPosition: 'bottom-right' as const,
    introUrl: intro,
    outroUrl: outro,
  };

  const { videoUrl: url } = await assembleVideo([scene(0, clip, 2)], ['subtitles'], '16:9', {
    branding,
  });
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), 'branded render produced output');

  const info = probe(outFile);
  const dur = durationSeconds(info);
  // 1s intro + 2s scene + 1s outro
  assert(Math.abs(dur - 4) < 0.6, `intro+scenes+outro concatenated (~4s, got ${dur.toFixed(2)}s)`);
  assert(/1920x1080/.test(info), 'bookends normalized to the render frame size');

  // Cues must be pushed later by the intro, or every caption fires early.
  const shifted = shiftCues([{ start: 0, end: 1.5, text: 'x' }], 1);
  assert(
    shifted[0].start === 1 && shifted[0].end === 2.5,
    'shiftCues delays captions by the intro duration',
  );
  assert(shiftCues([{ start: 0, end: 1, text: 'x' }], 0)[0].start === 0, 'no intro => no shift');

  fs.rmSync(path.join(process.cwd(), 'public', 'generated'), { recursive: true, force: true });
  assert(fs.existsSync(logo) && fs.existsSync(intro), 'brand assets not deleted by cleanup');
}

async function main() {
  fs.mkdirSync(workDir, { recursive: true });
  const clipA = path.join(workDir, 'a.mp4');
  const clipB = path.join(workDir, 'b.mp4');

  console.log('Creating synthetic source clips...');
  ffmpeg(['-f', 'lavfi', '-i', 'color=red:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipA]);
  ffmpeg(['-f', 'lavfi', '-i', 'color=blue:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipB]);
  assert(fs.existsSync(clipA) && fs.existsSync(clipB), 'source clips created');

  await renderAndCheck('16:9', [clipA, clipB]);
  await renderAndCheck('9:16', [clipA, clipB]);
  await renderAndCheck('1:1', [clipA, clipB]);
  await checkTwoWordCaption(clipA);
  checkFontResolution();
  checkCaptionFormats();
  await checkCaptionEscaping(clipA);
  await checkMusicDucking(clipA);
  checkOpenAiKeyAlias();
  await checkRenderSemaphore();
  await checkUserMedia(clipA, clipB);
  checkSceneOps(clipA);
  checkPlanGate();
  await checkBrandingRender(clipA);
  checkTransitionMath();
  const hasXfade = checkFfmpegCapabilities();
  await checkTransitionRender(clipA, clipB, hasXfade);
  checkKenBurnsFilter();
  await checkKenBurnsRender();

  // Regression guard: assembleVideo must not delete media it did not download.
  assert(fs.existsSync(clipA) && fs.existsSync(clipB), 'caller-owned local sources were NOT deleted');

  console.log('\nPASS — aspect ratio drives the rendered frame size.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFAIL:', err.message);
    process.exit(1);
  });
