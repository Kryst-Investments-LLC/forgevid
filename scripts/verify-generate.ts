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
  normalizeSceneDurations,
  renderDims,
  resolveLocalSource,
  resolveSceneClips,
  clampScenesToMedia,
  dropSilentScenes,
  spokenLine,
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
import { avatarDimension, buildAvatarVideoPayload } from '../lib/avatar-provider';
import { allowsAvatars, allowsVoiceCloning } from '../lib/plan';
import { estimateGenerationCost } from '../lib/cost-ledger';
import { SCENE_AUDIO_PADDING_SECONDS, buildAlignedNarration, synthesizeSceneVoiceovers } from '../lib/voiceover';
import { ListingParseError, listingPrompt, parseListingsCsv } from '../lib/listing-brief';
import { buildLowerThirdFilter, formatFacts } from '../lib/lower-third';
import { parseListingsFeed, parseResoJson, parseXmlFeed } from '../lib/mls-feed';

/** Unique per run, so a previous run's TTS cache can't fake a "first pass". */
const stampTag = Date.now().toString(36);

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

/**
 * public/generated holds REAL USER VIDEOS. These tests used to clean up with
 * fs.rmSync(publicGenerated, { recursive: true }) — which deleted every video a
 * user had ever generated. It really did, twice, before anyone noticed.
 *
 * Delete only what THIS run created: anything whose mtime is at or after the
 * moment the suite started.
 */
const RUN_STARTED_AT = Date.now();
const generatedDirRoot = path.join(process.cwd(), 'public', 'generated');

function cleanupOurGenerated(): void {
  if (!fs.existsSync(generatedDirRoot)) return;
  for (const name of fs.readdirSync(generatedDirRoot)) {
    const target = path.join(generatedDirRoot, name);
    try {
      if (fs.statSync(target).mtimeMs >= RUN_STARTED_AT) {
        fs.rmSync(target, { force: true, recursive: true });
      }
    } catch {
      // a file vanished under us — nothing to clean
    }
  }
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
  const { videoUrl: url, thumbnailUrl, scenes: rendered } = await assembleVideo(
    [scene(0, sources[0], 2), scene(1, sources[1], 2)],
    ['subtitles'],
    aspectRatio,
  );

  // Every scene must come back with its own poster frame for the editor.
  assert(
    rendered.every((s) => !!s.thumbnailUrl),
    `${aspectRatio}: per-scene thumbnails attached`,
  );
  for (const s of rendered) {
    const f = path.join(process.cwd(), 'public', 'generated', path.basename(s.thumbnailUrl!));
    assert(fs.existsSync(f) && fs.statSync(f).size > 500, `${aspectRatio}: ${s.id} thumbnail is a real image`);
  }

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
function meanVolumeDb(file: string, start: number, duration: number, preFilter?: string): number {
  const res = spawnSync(
    ffmpegPath,
    [
      '-nostdin',
      '-ss', String(start),
      '-t', String(duration),
      '-i', file,
      '-vn', // don't decode the video stream — we only want loudness
      // An optional band-pass lets a caller measure ONE stem inside a mix.
      '-af', preFilter ? `${preFilter},volumedetect` : 'volumedetect',
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

  // Music: 6s at 300Hz. Voice: 2s at 800Hz, at the level real TTS actually
  // arrives (~-21 dBFS). The old test attenuated it to -35 dBFS, far below the
  // compressor's threshold, so nothing ever ducked and nobody noticed.
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=300:duration=6', '-c:a', 'aac', music]);
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=800:duration=2', '-c:a', 'aac', voice]);

  const { videoUrl: url } = await assembleVideo([scene(0, clip, 4)], ['subtitles'], '16:9', {
    musicPath: music,
    voiceoverPath: voice,
  });
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), 'music+voiceover render produced output');

  const info = probe(outFile);
  assert(/Stream .*Audio: aac/.test(info), 'output has an audio stream');

  // Measure the MUSIC's own frequency band (its 300Hz tone), not the total mix.
  //
  // Total loudness is the wrong ruler: the voice sits on top of the ducked music
  // and hides the very drop we are trying to see. Isolating the music's tone
  // answers the real question — "is the music quieter while someone speaks?" —
  // however loud the voice happens to be. (Raising amix to normalize=0 made the
  // voice 6dB louder and broke the old, cruder assertion.)
  const musicBand = 'bandpass=f=300:width_type=h:w=40';
  const duringNarration = meanVolumeDb(outFile, 0.2, 1.5, musicBand);
  const afterNarration = meanVolumeDb(outFile, 2.6, 1.2, musicBand);
  console.log(`      music band — during narration: ${duringNarration} dB, after: ${afterNarration} dB`);
  // Regression: sidechaincompress ends when its key input ends, which used to
  // kill the music the instant narration stopped (audio ended at 2s, not 4s).
  assert(afterNarration > -90, 'music still plays after narration ends (sidechain key is padded)');
  assert(
    afterNarration > duringNarration + 6,
    `music is genuinely ducked while narration plays (${duringNarration}dB -> ${afterNarration}dB)`,
  );
  // And it must be genuinely AUDIBLE once the voice stops, not merely present in
  // the waveform. The old defaults buried the bed near -38dB, which nobody hears.
  assert(
    afterNarration > -40,
    `the bed is audible between lines, not just present (${afterNarration}dB)`,
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
  cleanupOurGenerated();

  console.log('Rendering the same scenes with transitions explicitly disabled...');
  const { videoUrl: cutUrl } = await assembleVideo(scenes, ['subtitles'], '16:9', {
    transition: null,
  });
  const cutDur = durationSeconds(probe(path.join(generated, path.basename(cutUrl))));
  assert(Math.abs(cutDur - 6) < 0.4, `hard-cut video is also 6s (got ${cutDur.toFixed(2)}s)`);
  cleanupOurGenerated();
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

  cleanupOurGenerated();
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
 * The HeyGen contract we THINK we speak, pinned. The live call cannot run here
 * (no key), so the payload builder is the testable seam.
 */
function checkAvatarContract() {
  console.log('\nChecking avatar provider contract + plan gates...');
  const payload: any = buildAvatarVideoPayload({
    script: 'Hello from ForgeVid',
    avatarId: 'av_123',
    aspectRatio: '9:16',
  });
  assert(payload.video_inputs?.[0]?.character?.avatar_id === 'av_123', 'payload carries the avatar id');
  assert(payload.video_inputs?.[0]?.voice?.input_text === 'Hello from ForgeVid', 'payload carries the script');
  assert(payload.dimension.width === 720 && payload.dimension.height === 1280, 'vertical avatar renders 720x1280');
  assert(avatarDimension('16:9').width === 1280, 'landscape avatar is 1280x720');
  assert(!('voice_id' in (payload.video_inputs[0].voice ?? {})), 'no voice_id unless one is chosen');

  const withVoice: any = buildAvatarVideoPayload({
    script: 'x'.repeat(5),
    avatarId: 'a',
    aspectRatio: '16:9',
    voiceId: 'cloned123',
  });
  assert(withVoice.video_inputs[0].voice.voice_id === 'cloned123', 'chosen voice id is passed through');

  assert(!allowsAvatars('free') && !allowsAvatars('starter'), 'avatars are gated below pro');
  assert(allowsAvatars('pro'), 'pro can render avatars');
  assert(!allowsVoiceCloning('free') && allowsVoiceCloning('pro'), 'voice cloning is pro+');

  const cost = estimateGenerationCost({ avatarSeconds: 60 });
  assert(cost.totalUsd === 0.5, `a 60s avatar render books $0.50 (got $${cost.totalUsd})`);
}

/** Quality tiers are pure math — assert all of them. */
function checkRenderDims() {
  console.log('\nChecking render quality dimensions...');
  const d = (a: any, q: any) => renderDims(a, q);
  assert(d('16:9', 'full').width === 1920, 'full 16:9 is 1920x1080');
  assert(d('16:9', 'draft').width === 960 && d('16:9', 'draft').height === 540, 'draft halves 16:9');
  assert(d('16:9', '4k').width === 3840 && d('16:9', '4k').height === 2160, '4k doubles 16:9 to 3840x2160');
  assert(d('9:16', '4k').width === 2160 && d('9:16', '4k').height === 3840, '4k vertical is 2160x3840');
  assert(d('1:1', 'draft').width === 540, 'draft square is 540x540');
}

/** Draft previews render at half resolution so iteration is cheap. */
async function checkDraftMode(clipA: string, clipB: string) {
  console.log('\nRendering a draft preview (expect 960x540)...');
  const { videoUrl: url } = await assembleVideo(
    [scene(0, clipA, 2), scene(1, clipB, 2)],
    ['subtitles'],
    '16:9',
    { renderQuality: 'draft', transition: null },
  );
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  const info = probe(outFile);
  assert(/960x540/.test(info), 'draft renders at half resolution (960x540)');
  assert(Math.abs(durationSeconds(info) - 4) < 0.5, 'draft keeps the full duration');
  cleanupOurGenerated();
}

/**
 * Narration-paced scenes + the per-scene TTS cache (one mechanism, two wins).
 * The AUDIO decides each scene's duration, and a re-render after editing one
 * scene only re-synthesizes that scene.
 */
async function checkNarrationPacing(clipA: string, clipB: string) {
  console.log('\nChecking narration pacing + per-scene TTS cache...');

  // Fake synthesizer: writes real mp3 tones of known lengths (1s and 2s), and
  // counts calls so cache hits are observable.
  let synthCalls = 0;
  const fakeSynth = async (text: string): Promise<Buffer> => {
    synthCalls += 1;
    const seconds = /LONG/.test(text) ? 2 : 1;
    const f = path.join(workDir, `synth_${synthCalls}.mp3`);
    ffmpeg(['-f', 'lavfi', '-i', `sine=frequency=500:duration=${seconds}`, '-c:a', 'libmp3lame', f]);
    return fs.readFileSync(f);
  };

  const lines = [
    { id: 'scene-1', description: `pacing test A ${stampTag}` },
    { id: 'scene-2', description: `pacing test LONG B ${stampTag}` },
  ];

  const first = await synthesizeSceneVoiceovers(lines, undefined, fakeSynth as any);
  assert(!!first && first.length === 2, 'per-scene synthesis produced both segments');
  assert(synthCalls === 2, 'first pass synthesized both scenes');
  assert(Math.abs(first![0].durationSeconds - 1) < 0.2, `segment 1 ~1s (${first![0].durationSeconds}s)`);
  assert(Math.abs(first![1].durationSeconds - 2) < 0.2, `segment 2 ~2s (${first![1].durationSeconds}s)`);
  assert(first!.every((s) => !s.cached), 'first pass was not cached');

  // Second pass: everything must come from cache — the re-render cost win.
  const second = await synthesizeSceneVoiceovers(lines, undefined, fakeSynth as any);
  assert(synthCalls === 2, 'second pass made ZERO synth calls (cache hit)');
  assert(second!.every((s) => s.cached), 'second pass served from cache');

  // Editing ONE scene only re-synthesizes that one.
  const edited = [lines[0], { id: 'scene-2', description: `pacing test LONG B edited ${stampTag}` }];
  await synthesizeSceneVoiceovers(edited, undefined, fakeSynth as any);
  assert(synthCalls === 3, 'editing one scene re-synthesizes only that scene');

  // Speech is a FLOOR on a scene, never a ceiling.
  //
  // Case A — the requested length is longer than the copy (a 25s advert whose
  // script runs 13s). The video must still be the length that was asked for;
  // the spare time becomes a pause, not a shorter advert.
  const roomy = [scene(0, clipA, 5, lines[0].description), scene(1, clipB, 5, lines[1].description)];
  const result = await assembleVideo(roomy, [], '16:9', {
    sceneVoiceovers: first,
    transition: null,
  });

  const held = result.scenes.map((s) => s.duration);
  assert(
    Math.abs(held[0] - 5) < 0.01 && Math.abs(held[1] - 5) < 0.01,
    `a short script does not shorten the video (${held.join('s, ')}s of the requested 5s+5s)`,
  );

  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(result.videoUrl));
  const dur = durationSeconds(probe(outFile));
  assert(Math.abs(dur - 10) < 0.6, `video is the requested 10s (got ${dur.toFixed(2)}s)`);
  assert(/Stream .*Audio: aac/.test(probe(outFile)), 'narration made it into the mux');

  // Cues came from the segments, not Whisper: each spans its own scene.
  assert(result.cues.length === 2, 'one cue per scene');
  assert(result.cues[0].start === 0 && Math.abs(result.cues[0].end - 1) < 0.2, 'cue 1 spans its audio');
  assert(
    Math.abs(result.cues[1].start - held[0]) < 0.01,
    'cue 2 starts exactly where scene 2 starts, not where line 1 stopped talking',
  );

  // Case B — the copy is longer than the requested scene. The line must never be
  // cut off mid-word, so the scene grows to hold it.
  const cramped = [scene(0, clipA, 1, lines[0].description), scene(1, clipB, 1, lines[1].description)];
  const grown = await assembleVideo(cramped, [], '16:9', {
    sceneVoiceovers: first,
    transition: null,
  });
  const paced = grown.scenes.map((s) => s.duration);
  assert(
    Math.abs(paced[1] - (2 + SCENE_AUDIO_PADDING_SECONDS)) < 0.25,
    `a scene grows to hold a line longer than it (${paced.join('s, ')}s)`,
  );
  const grownFile = path.join(process.cwd(), 'public', 'generated', path.basename(grown.videoUrl));
  const grownDur = durationSeconds(probe(grownFile));
  const speechTotal = 1 + 2 + 2 * SCENE_AUDIO_PADDING_SECONDS;
  assert(
    Math.abs(grownDur - speechTotal) < 0.6,
    `video stretches to fit the speech (~${speechTotal.toFixed(2)}s, got ${grownDur.toFixed(2)}s)`,
  );
  fs.rmSync(grownFile, { force: true });

  cleanupOurGenerated();
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

  cleanupOurGenerated();
  assert(fs.existsSync(logo) && fs.existsSync(intro), 'brand assets not deleted by cleanup');
}

/**
 * Locally-stored assets (uploaded product shots, images imported from a site)
 * carry a PUBLIC-relative url. A live generation caught this: the renderer
 * treated `/uploads/site/x.jpg` as a filesystem path and died with
 * "Scene source not found on disk".
 */
async function checkLocalSourceResolution() {
  console.log('\nChecking public-relative scene sources...');
  const publicDir = path.resolve(process.cwd(), 'public');

  assert(
    resolveLocalSource('/uploads/site/x.jpg') === path.join(publicDir, 'uploads', 'site', 'x.jpg'),
    'a public-relative url resolves under public/',
  );
  const absolute = path.join(workDir, 'a.mp4');
  assert(resolveLocalSource(absolute) === absolute, 'an absolute path is passed through untouched');

  let escaped = false;
  try {
    resolveLocalSource('/../../../../etc/passwd');
  } catch {
    escaped = true;
  }
  assert(escaped, 'a traversal out of public/ is refused');

  // The real thing: render a scene whose source is a public-relative image.
  const uploadDir = path.join(publicDir, 'uploads', 'verify');
  fs.mkdirSync(uploadDir, { recursive: true });
  const still = path.join(uploadDir, 'still.jpg');
  ffmpeg(['-f', 'lavfi', '-i', 'color=green:s=640x360', '-frames:v', '1', still]);

  const { videoUrl } = await assembleVideo(
    [
      {
        id: 'scene-1',
        index: 0,
        description: 'Product shot',
        keywords: [],
        duration: 3,
        visualElements: [],
        clipUrl: '/uploads/verify/still.jpg',
        matchedQuery: 'local',
        mediaType: 'image',
      },
    ],
    ['captions'],
    '16:9',
    { transition: null },
  );
  const out = path.join(publicDir, 'generated', path.basename(videoUrl));
  assert(fs.existsSync(out), 'a scene sourced from a public-relative url renders');
  assert(fs.existsSync(still), 'the source image was NOT deleted by cleanup');
  fs.rmSync(uploadDir, { recursive: true, force: true });
  fs.rmSync(out, { force: true });
}

/**
 * A 25-second advert whose copy runs 13 seconds must still be 25 seconds long,
 * and its second line must not play over its first shot. Prove both by measuring
 * loudness: speech at each scene's start, silence in the gaps.
 */
async function checkNarrationAlignment() {
  console.log('\nChecking narration is aligned to the scene timeline...');

  const one = path.join(workDir, 'line1.mp3');
  const two = path.join(workDir, 'line2.mp3');
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'libmp3lame', one]);
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=880:duration=1', '-c:a', 'libmp3lame', two]);

  const segments = [
    { sceneId: 'scene-1', path: one, durationSeconds: 1, cached: false },
    { sceneId: 'scene-2', path: two, durationSeconds: 1, cached: false },
  ];

  // Scene 1 runs 0-5s, scene 2 runs 5-8s. The lines are 1s each.
  const out = path.join(workDir, 'aligned.m4a');
  await buildAlignedNarration(segments, [0, 5], 8, out);

  const info = probe(out);
  const dur = durationSeconds(info);
  assert(Math.abs(dur - 8) < 0.3, `track fills the whole video (${dur.toFixed(2)}s of 8s)`);

  assert(meanVolumeDb(out, 0.1, 0.7) > -35, 'line 1 plays at scene 1 start');
  assert(meanVolumeDb(out, 2.5, 2.0) < -60, 'the gap between lines is silent, not filled early');
  assert(meanVolumeDb(out, 5.1, 0.7) > -35, 'line 2 plays at scene 2 start, not over scene 1');
  assert(meanVolumeDb(out, 6.5, 1.0) < -60, 'the tail after the last line is silent');

  // The old concat behaviour is what this replaces: back-to-back, so line 2
  // would have landed at 1s instead of 5s.
  assert(meanVolumeDb(out, 1.2, 0.6) < -60, 'line 2 did NOT slide forward to 1s (the concat bug)');

  fs.rmSync(one, { force: true });
  fs.rmSync(two, { force: true });
  fs.rmSync(out, { force: true });
}

/**
 * White captions with a 2px outline vanish over a white kitchen — which is most
 * of a real-estate listing. Render onto a WHITE frame and measure the caption
 * band: with a scrim it must be dark; the outline alone was not enough.
 */
async function checkCaptionContrast() {
  console.log('\nChecking captions stay legible on a white frame...');

  const white = path.join(workDir, 'white.mp4');
  ffmpeg(['-f', 'lavfi', '-i', 'color=white:s=640x360:r=24', '-t', '2', '-pix_fmt', 'yuv420p', white]);

  const filter = buildCaptionFilter([{ start: 0, end: 2, text: 'Book your private viewing today' }]);
  assert(/box=1/.test(filter), 'the caption filter draws a scrim box');
  assert(/boxcolor=black@0\.55/.test(filter), 'the scrim is semi-transparent black');

  const { videoUrl } = await assembleVideo(
    [scene(0, white, 2, 'Book your private viewing today')],
    ['subtitles'],
    '16:9',
    { transition: null },
  );
  const out = path.join(process.cwd(), 'public', 'generated', path.basename(videoUrl));
  assert(fs.existsSync(out), 'the white-background render succeeded');

  /** Mean luminance of a crop of the frame at t=1s. Pure white is 255. */
  const brightness = (crop: string): number => {
    const res = spawnSync(
      ffmpegPath,
      ['-nostdin', '-ss', '1', '-i', out, '-frames:v', '1',
       '-vf', `${crop},format=gray,signalstats,metadata=print`, '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    );
    return Number((String(res.stderr).match(/lavfi\.signalstats\.YAVG=([\d.]+)/) || [])[1]);
  };

  // Compare the caption's own strip against untouched white higher up the frame,
  // rather than trusting an absolute number: the box only spans the TEXT, so a
  // full-width band is mostly margin and hides the effect.
  const control = brightness('crop=700:40:610:800');
  const captionStrip = brightness('crop=600:40:660:1014');
  assert(Number.isFinite(control) && Number.isFinite(captionStrip), 'measured both strips');
  assert(control > 250, `the untouched frame really is white (YAVG ${control.toFixed(1)})`);
  assert(
    captionStrip < 210,
    `the scrim darkens the caption over white (YAVG ${captionStrip.toFixed(1)} vs white ${control.toFixed(1)})`,
  );
  assert(
    control - captionStrip > 45,
    `caption is clearly separated from the background (${(control - captionStrip).toFixed(1)} levels)`,
  );

  // And the scrim can be turned off for callers who want the old look.
  const bare = buildCaptionFilter([{ start: 0, end: 1, text: 'hello' }], { boxOpacity: 0 });
  assert(!/box=1/.test(bare), 'boxOpacity: 0 disables the scrim');

  fs.rmSync(white, { force: true });
  fs.rmSync(out, { force: true });
}

/**
 * The lower third an estate agent expects: address and price burned in for the
 * opening seconds, then gone. Proven by rendering it onto a white clip and
 * measuring the block's corner — dark while it shows, white once it leaves.
 */
async function checkLowerThird() {
  console.log('\nChecking the lower third (address + price)...');

  const lt = { title: '14 Maple Court', facts: ['$685,000', '4 bed', '2 bath'], start: 0.5, duration: 2 };
  const filter = buildLowerThirdFilter(lt);
  assert(/drawtext/.test(filter), 'a drawtext chain is produced');
  assert(filter.includes('14 Maple Court'), 'the address is drawn');
  assert(/685/.test(filter), 'the price is drawn');
  assert(/bed/.test(filter) && /bath/.test(filter), 'beds and baths are drawn');
  assert(/between\(t\\,0\.500\\,2\.500\)/.test(filter), 'it is enabled only for its window');
  assert(formatFacts(['$1', undefined, '2 bed', '']) === '$1  ·  2 bed', 'facts join, blanks dropped');
  assert(buildLowerThirdFilter({ title: '  ' }) === '', 'no title, no overlay');

  // The address is USER DATA going into a filtergraph. A colon or a quote must
  // not be able to rewrite it.
  const hostile = buildLowerThirdFilter({ title: "O'Brien: Ave, 100%" });
  assert(!/[^\\]:.*fontcolor=red/.test(hostile), 'no injected option survives');
  assert(!hostile.includes("O'Brien"), 'the apostrophe is stripped, not passed through raw');
  assert(hostile.includes('\\:'), 'the colon is escaped');
  assert(hostile.includes('%%'), 'the percent is escaped (drawtext strftime)');

  // A hostile colour must not reach the graph either.
  const badColor = buildLowerThirdFilter({ title: 'x' }, { accentColor: 'red:fontsize=200' });
  assert(!badColor.includes('fontsize=200'), 'an invalid accent colour falls back to the default');

  // Render it: dark block while enabled, white once it has gone.
  const white = path.join(workDir, 'lt_white.mp4');
  ffmpeg(['-f', 'lavfi', '-i', 'color=white:s=640x360:r=24', '-t', '6', '-pix_fmt', 'yuv420p', white]);
  const { videoUrl } = await assembleVideo([scene(0, white, 6, 'x')], [], '16:9', {
    transition: null,
    lowerThird: { title: '14 Maple Court', facts: ['$685,000', '4 bed'], start: 0.5, duration: 2 },
  });
  const out = path.join(process.cwd(), 'public', 'generated', path.basename(videoUrl));

  const brightness = (at: number): number => {
    const res = spawnSync(
      ffmpegPath,
      ['-nostdin', '-ss', String(at), '-i', out, '-frames:v', '1',
       '-vf', 'crop=520:150:60:830,format=gray,signalstats,metadata=print', '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    );
    return Number((String(res.stderr).match(/lavfi\.signalstats\.YAVG=([\d.]+)/) || [])[1]);
  };

  const during = brightness(1.5);
  const after = brightness(5);
  assert(Number.isFinite(during) && Number.isFinite(after), 'measured the lower-third corner');
  assert(during < 215, `the block darkens the frame while shown (YAVG ${during.toFixed(1)})`);
  assert(after > 250, `it is gone afterwards (YAVG ${after.toFixed(1)} back to white)`);
  assert(after - during > 40, `clear on/off contrast (${(after - during).toFixed(1)} levels)`);

  fs.rmSync(white, { force: true });
  fs.rmSync(out, { force: true });
}

function checkClampScenesToMedia() {
  console.log('\nChecking scene count matches the supplied media...');
  const mk = (n: number) => ({
    id: `scene-${n}`, index: n - 1, description: `d${n}`, narration: `n${n}`,
    keywords: [], duration: 4, visualElements: [],
  });
  const six = [1, 2, 3, 4, 5, 6].map(mk);

  // The real failure: 6 planned scenes, 5 photos, so shot 6 was somebody else's kitchen.
  const clamped = clampScenesToMedia(six, 5);
  assert(clamped.length === 5, `6 scenes against 5 photos becomes 5 (got ${clamped.length})`);
  assert(clamped[4].id === 'scene-5' && clamped[4].index === 4, 'the survivors are renumbered');

  assert(clampScenesToMedia(six, 0).length === 6, 'no media leaves the plan alone');
  assert(clampScenesToMedia(six, 9).length === 6, 'more photos than scenes leaves the plan alone');
  assert(clampScenesToMedia(six, 6).length === 6, 'an exact match leaves the plan alone');

  // The runtime must be re-spread over what survives, not lost with the cut scenes.
  const renormalised = normalizeSceneDurations(clampScenesToMedia(six, 5), 20);
  const total = renormalised.reduce((a, s) => a + s.duration, 0);
  assert(Math.abs(total - 20) < 0.05, `the 20s budget survives the clamp (got ${total.toFixed(2)}s)`);
}

function checkListingCsv() {
  console.log('\nChecking the estate agent CSV import...');

  const csv = [
    'Listing ID,Address,Price,Bedrooms,Bathrooms,Features,Photo URLs',
    '"A-1","14 Maple Court","$685,000",4,2,"Renovated kitchen, large garden","https://x.test/1.jpg https://x.test/2.jpg"',
    '"A-2","9 Oak Lane","$412,500",3,1,"Close to schools","https://x.test/3.jpg;https://x.test/4.jpg"',
  ].join('\n');

  const listings = parseListingsCsv(csv);
  assert(listings.length === 2, `parsed both rows (got ${listings.length})`);
  assert(listings[0].ref === 'A-1' && listings[0].address === '14 Maple Court', 'ref and address read');
  // The price contains a comma INSIDE quotes — the classic CSV trap.
  assert(listings[0].price === '$685,000', `a quoted comma in the price survives (${listings[0].price})`);
  assert(listings[0].beds === 4 && listings[0].baths === 2, 'beds and baths parsed as numbers');
  assert(listings[0].photos.length === 2, 'space-separated photo urls split');
  assert(listings[1].photos.length === 2, 'semicolon-separated photo urls split');
  assert(listings[0].highlights === 'Renovated kitchen, large garden', 'quoted features keep their comma');

  // Column aliases: no two CRMs agree on names.
  const aliased = parseListingsCsv('mls,property,images\nM9,"1 High St","https://x.test/a.jpg"');
  assert(aliased[0].ref === 'M9' && aliased[0].address === '1 High St', 'column aliases are honoured');

  // Bad rows fail LOUDLY rather than producing a video of nothing.
  let rejected = 0;
  for (const bad of [
    'address,photos\n"",https://x.test/a.jpg',            // no address
    'address,photos\n"1 High St",""',                     // no photos
    'address\n"1 High St"',                               // no photos column
    'beds,photos\n3,https://x.test/a.jpg',                // no address column
  ]) {
    try { parseListingsCsv(bad); } catch (e) { if (e instanceof ListingParseError) rejected++; }
  }
  assert(rejected === 4, `every malformed CSV is rejected loudly (${rejected}/4)`);

  // The prompt may only contain facts the agent supplied.
  const prompt = listingPrompt(listings[0], 5);
  assert(prompt.includes('14 Maple Court') && prompt.includes('4 bedrooms'), 'the prompt states the real facts');
  assert(prompt.includes('$685,000'), 'the prompt states the real price');
  assert(/never invent/i.test(prompt), 'the prompt forbids inventing features');
  const noFacts = listingPrompt({ ref: 'x', address: '2 Elm St', photos: ['a'] }, 3);
  assert(!/bedroom|bathroom|listed at/.test(noFacts), 'absent facts are simply not mentioned');
}

function checkMlsFeed() {
  console.log('\nChecking MLS / portal feed ingestion...');

  // RESO Web API: the modern standard. Photos live in Media[].MediaURL.
  const reso = JSON.stringify({
    value: [
      {
        ListingKey: 'RESO-1',
        UnparsedAddress: '14 Maple Court, Springfield',
        ListPrice: 685000,
        BedroomsTotal: 4,
        BathroomsTotalInteger: 2,
        PublicRemarks: 'Renovated kitchen and a large garden.',
        Media: [
          { MediaURL: 'https://cdn.test/1.jpg', Order: 1 },
          { MediaURL: 'https://cdn.test/2.jpg', Order: 2 },
        ],
      },
    ],
  });
  const [a] = parseResoJson(reso);
  assert(a.ref === 'RESO-1' && a.address.startsWith('14 Maple Court'), 'RESO ref and address');
  assert(a.price === '$685,000', `a numeric ListPrice becomes money (${a.price})`);
  assert(a.beds === 4 && a.baths === 2, 'RESO bed/bath counts');
  assert(a.photos.length === 2 && a.photos[0].endsWith('1.jpg'), 'Media[].MediaURL extracted in order');
  assert(!!a.highlights && a.highlights.includes('Renovated'), 'PublicRemarks become highlights');

  assert(
    parseResoJson(JSON.stringify([{ Address: '1 High St', Photos: 'https://x.test/a.jpg' }])).length === 1,
    'a bare array of listings parses',
  );

  // A portal XML export: photos as child elements AND as attributes.
  const xml = `<?xml version="1.0"?><Listings>
    <Property>
      <MlsNumber>X-9</MlsNumber>
      <StreetAddress>9 Oak Lane</StreetAddress>
      <Price>412500</Price>
      <Bedrooms>3</Bedrooms>
      <Baths>1</Baths>
      <Remarks>Close to schools.</Remarks>
      <Photos><Photo>https://cdn.test/a.jpg</Photo><Photo>https://cdn.test/b.jpg</Photo></Photos>
    </Property>
    <Property>
      <MlsNumber>X-10</MlsNumber>
      <StreetAddress>2 Elm Road</StreetAddress>
      <Photos><Photo url="https://cdn.test/c.jpg"/></Photos>
    </Property>
  </Listings>`;
  const xmlListings = parseXmlFeed(xml);
  assert(xmlListings.length === 2, `both XML properties parse (${xmlListings.length})`);
  assert(xmlListings[0].ref === 'X-9' && xmlListings[0].beds === 3, 'XML aliases (MlsNumber, Bedrooms)');
  assert(xmlListings[0].price === '$412,500', 'XML price formatted');
  assert(xmlListings[0].photos.length === 2, 'photos from child elements');
  assert(xmlListings[1].photos[0].endsWith('c.jpg'), 'photos from an attribute');
  assert(xmlListings[1].beds === undefined, 'a missing bed count stays absent, never guessed');

  // Content-type dispatch, and sniffing when the server does not say.
  assert(parseListingsFeed(reso, 'application/json').length === 1, 'json dispatch');
  assert(parseListingsFeed(xml, 'text/xml').length === 2, 'xml dispatch');
  assert(parseListingsFeed(reso, 'text/plain').length === 1, 'sniffs JSON without a content-type');
  assert(parseListingsFeed(xml, '').length === 2, 'sniffs XML without a content-type');

  // Bad feeds fail LOUDLY: a listing video of the wrong house is worse than none.
  const bad: Array<[string, string]> = [
    ['{"value":[{"ListPrice":1}]}', 'application/json'], // no address
    ['{"value":[{"Address":"x"}]}', 'application/json'], // no photos
    ['{"value":[]}', 'application/json'], // empty
    ['not json at all', 'application/json'],
    ['<Listings></Listings>', 'text/xml'], // no listings
    ['hello', 'text/plain'], // neither shape
  ];
  let rejected = 0;
  for (const [text, ct] of bad) {
    try {
      parseListingsFeed(text, ct);
    } catch (e) {
      if (e instanceof ListingParseError) rejected++;
    }
  }
  assert(rejected === bad.length, `every malformed feed is rejected loudly (${rejected}/${bad.length})`);

  // A feed must never smuggle a non-http url through to the renderer.
  const sneaky = parseResoJson(
    JSON.stringify({
      value: [{ Address: '1 High St', Photos: 'file:///etc/passwd https://ok.test/a.jpg javascript:alert(1)' }],
    }),
  );
  assert(
    sneaky[0].photos.length === 1 && sneaky[0].photos[0] === 'https://ok.test/a.jpg',
    'only http(s) photo urls survive parsing',
  );
}

function checkSilentSceneDrop() {
  console.log('\nChecking invented end-cards are dropped...');
  const mk = (n: number, narration?: string) => ({
    id: `scene-${n}`, index: n - 1, description: `desc ${n}`, narration,
    keywords: [], duration: 3, visualElements: [],
  });

  // The real failure: GPT appended a card with no narration, so the voiceover
  // read "Fade out to black with the price and contact details displayed".
  const withCard = [
    mk(1, 'Welcome to 14 Maple Court.'),
    mk(2, 'Four spacious bedrooms.'),
    { ...mk(3), description: 'Fade out to black with the price displayed', narration: '' },
  ];
  const pruned = dropSilentScenes(withCard);
  assert(pruned.length === 2, `the silent end-card scene is dropped (${pruned.length} scenes left)`);
  assert(
    !pruned.some((s) => /fade out to black/i.test(spokenLine(s))),
    'no stage direction survives into the spoken script',
  );
  assert(pruned[0].id === 'scene-1' && pruned[1].id === 'scene-2', 'remaining scenes are renumbered contiguously');

  // Legacy plans have NO narration anywhere; their descriptions must still be
  // spoken, or every old video would fall silent on re-render.
  const legacy = [mk(1), mk(2)];
  assert(dropSilentScenes(legacy).length === 2, 'a legacy plan (no narration at all) is left untouched');
  assert(spokenLine(dropSilentScenes(legacy)[0]) === 'desc 1', 'legacy scenes still speak their description');

  // Never return an empty plan.
  const allBlank = [mk(1, '  '), mk(2, '')];
  assert(dropSilentScenes(allBlank).length === 2, 'an all-blank plan is not pruned to nothing');
}

function checkSpokenLine() {
  console.log('\nChecking spoken narration vs stage direction...');

  // The bug: a commercial narrated its own stage directions out loud.
  assert(
    spokenLine({
      description: 'Close-up of coffee beans pouring into a grinder',
      narration: 'It starts with beans picked at their peak.',
    }) === 'It starts with beans picked at their peak.',
    'narration is spoken, not the description',
  );
  assert(
    spokenLine({ description: 'Sunrise over the sea' }) === 'Sunrise over the sea',
    'a scene planned before narration existed still speaks its description',
  );
  assert(
    spokenLine({ description: 'Fallback line', narration: '   ' }) === 'Fallback line',
    'a blank narration falls back rather than rendering silence',
  );
  assert(
    spokenLine({ description: 'Fallback line', narration: '' }) === 'Fallback line',
    'an empty narration falls back',
  );
}

function checkDurationNormalization() {
  console.log('\nChecking scene duration budget...');
  const mk = (durations: number[]) =>
    durations.map((d, i) => ({
      id: `scene-${i + 1}`, index: i, description: 'x', keywords: [], duration: d, visualElements: [],
    }));
  const sum = (xs: Array<{ duration: number }>) => xs.reduce((a, s) => a + s.duration, 0);

  // The exact failure: gpt-4o-mini returned ~12s per scene for a 15s video.
  const over = normalizeSceneDurations(mk([12, 12, 10, 10, 9]), 15);
  assert(Math.abs(sum(over) - 15) < 0.05, `5 bloated scenes rescale to 15s (got ${sum(over).toFixed(2)})`);
  assert(over.every((s) => s.duration >= 1), 'every scene keeps a 1s floor');
  // Relative weighting is preserved: scene 1 stays >= the shorter scenes.
  assert(over[0].duration >= over[4].duration, 'the model relative weighting survives');

  const under = normalizeSceneDurations(mk([1, 1, 1]), 30);
  assert(Math.abs(sum(under) - 30) < 0.05, `short scenes stretch up to 30s (got ${sum(under).toFixed(2)})`);

  const zero = normalizeSceneDurations(mk([0, 0, 0, 0]), 20);
  assert(Math.abs(sum(zero) - 20) < 0.05, 'zero-weight scenes split evenly to the total');
  assert(zero.every((s) => s.duration === 5), 'even split gives 5s each');

  const tiny = normalizeSceneDurations(mk([100, 1, 1, 1, 1, 1]), 6);
  assert(tiny.every((s) => s.duration >= 1), 'the 1s floor holds even against a dominant scene');
  assert(Math.abs(sum(tiny) - 6) < 0.05, `total still lands on 6 with a floor (got ${sum(tiny).toFixed(2)})`);
}

async function main() {
  fs.mkdirSync(workDir, { recursive: true });
  const clipA = path.join(workDir, 'a.mp4');
  const clipB = path.join(workDir, 'b.mp4');

  console.log('Creating synthetic source clips...');
  ffmpeg(['-f', 'lavfi', '-i', 'color=red:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipA]);
  ffmpeg(['-f', 'lavfi', '-i', 'color=blue:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipB]);
  assert(fs.existsSync(clipA) && fs.existsSync(clipB), 'source clips created');

  await checkLocalSourceResolution();
  checkAvatarContract();
  await checkNarrationAlignment();
  await checkCaptionContrast();
  await checkLowerThird();
  checkClampScenesToMedia();
  checkListingCsv();
  checkMlsFeed();
  checkSilentSceneDrop();
  checkSpokenLine();
  checkDurationNormalization();
  checkRenderDims();
  await renderAndCheck('16:9', [clipA, clipB]);
  await renderAndCheck('9:16', [clipA, clipB]);
  await renderAndCheck('1:1', [clipA, clipB]);
  await checkDraftMode(clipA, clipB);
  await checkTwoWordCaption(clipA);
  checkFontResolution();
  checkCaptionFormats();
  await checkCaptionEscaping(clipA);
  await checkMusicDucking(clipA);
  checkOpenAiKeyAlias();
  await checkNarrationPacing(clipA, clipB);
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
