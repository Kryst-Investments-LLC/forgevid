/**
 * End-to-end verification against a REAL PostgreSQL database.
 *
 * Drives the actual generation pipeline (runGeneration / rerenderVideo) the way
 * the API route and the worker do, and asserts what landed in the database.
 *
 * No external APIs are needed: user media covers every scene (so no Pexels), the
 * script falls back to the prompt (no OpenAI), the voiceover is skipped (no
 * ElevenLabs), and Cloudinary is unconfigured so the render stays local.
 *
 *   DATABASE_URL=postgresql://... npm run verify:e2e
 *
 * Everything it creates is deleted afterwards.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { resolveFfmpegPath } from '../lib/ffmpeg-env';
import { runGeneration, rerenderVideo, loadScenes, saveScenes } from '../lib/generation-pipeline';
import { resolveBranding } from '../lib/brand-kit';
import { WATERMARK_TEXT } from '../lib/plan';
import type { ResolvedScene } from '../lib/video-generator';

const ffmpegPath = resolveFfmpegPath();
const workDir = path.join(process.cwd(), 'public', 'temp', 'verify-e2e');
const generatedDir = path.join(process.cwd(), 'public', 'generated');
const stamp = Date.now();

function ffmpeg(args: string[]) {
  execFileSync(ffmpegPath, ['-y', ...args], { stdio: 'pipe' });
}

function probeDuration(file: string): number {
  try {
    execFileSync(ffmpegPath, ['-i', file], { stdio: 'pipe' });
  } catch (err: any) {
    const m = String(err.stderr ?? '').match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  throw new Error(`Could not probe ${file}`);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok  ${msg}`);
}

function localFile(url: string): string {
  return path.join(generatedDir, path.basename(url));
}

function meta(raw: string | null): any {
  try {
    return JSON.parse(raw ?? '{}');
  } catch {
    return {};
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required for the end-to-end check.');
    process.exit(1);
  }

  fs.mkdirSync(workDir, { recursive: true });
  const clipA = path.join(workDir, 'a.mp4');
  const clipB = path.join(workDir, 'b.mp4');
  ffmpeg(['-f', 'lavfi', '-i', 'color=red:s=640x360:r=24', '-t', '6', '-pix_fmt', 'yuv420p', clipA]);
  ffmpeg(['-f', 'lavfi', '-i', 'color=blue:s=640x360:r=24', '-t', '6', '-pix_fmt', 'yuv420p', clipB]);

  const email = `e2e-${stamp}@forgevid.test`;
  let userId = '';

  try {
    console.log('1. Seeding a user and their media...');
    const user = await prisma.user.create({ data: { email, name: 'E2E User' } });
    userId = user.id;

    const assetA = await prisma.mediaAsset.create({
      data: { name: `e2e-hero-${stamp}`, fileName: 'a.mp4', type: 'VIDEO', url: clipA, uploadedById: userId },
    });
    const assetB = await prisma.mediaAsset.create({
      data: { name: `e2e-detail-${stamp}`, fileName: 'b.mp4', type: 'VIDEO', url: clipB, uploadedById: userId },
    });
    assert(!!assetA.id && !!assetB.id, 'media assets created and owned by the user');

    // ---- 2. A generation, exactly as the route creates it -------------------
    console.log('\n2. Running a real generation (QUEUED -> PROCESSING -> COMPLETED)...');
    const input = {
      prompt: 'A short product film about a red widget',
      style: 'modern',
      duration: 4,
      addOns: ['subtitles'],
      aspectRatio: '16:9' as const,
      mediaAssetIds: [assetA.id],
      transition: null,
    };

    const video = await prisma.video.create({
      data: {
        title: input.prompt.slice(0, 80),
        description: input.prompt,
        status: 'QUEUED',
        duration: input.duration,
        format: 'mp4',
        userId,
        metadata: JSON.stringify({
          generation: { stage: 'queued', percent: 5, updatedAt: new Date().toISOString() },
          request: { ...input },
        }),
      },
    });
    assert(video.status === 'QUEUED', 'video row starts QUEUED (needed the new enum value)');

    const url = await runGeneration(video.id, input);

    const done = await prisma.video.findUniqueOrThrow({ where: { id: video.id } });
    assert(done.status === 'COMPLETED', 'status transitioned to COMPLETED');
    assert(!!done.url && done.url === url, 'video url persisted on the row');
    assert(done.resolution === '1920x1080', `resolution persisted (${done.resolution})`);
    assert(!!done.thumbnail, 'thumbnail persisted');

    const outFile = localFile(done.url!);
    assert(fs.existsSync(outFile), 'the rendered mp4 exists on disk');
    const dur = probeDuration(outFile);
    assert(Math.abs(dur - input.duration) < 0.6, `rendered ${dur.toFixed(2)}s for a ${input.duration}s request`);

    const thumbFile = localFile(done.thumbnail!);
    assert(fs.existsSync(thumbFile) && fs.statSync(thumbFile).size > 500, 'thumbnail is a real image on disk');

    const m = meta(done.metadata);
    assert(m.generation?.stage === 'done' && m.generation?.percent === 100, 'progress reached done/100');
    assert(Array.isArray(m.scenes) && m.scenes.length >= 1, 'scenes persisted for the editor');
    assert(Array.isArray(m.captions) && m.captions.length >= 1, 'captions persisted for SRT/VTT export');
    assert(m.scenes[0].clipUrl === clipA, "the user's own media was used, not stock");

    // ---- 3. Re-render from edited scenes ------------------------------------
    console.log('\n3. Editing the persisted scenes and re-rendering...');
    const scenes = await loadScenes(video.id);
    assert(scenes.length >= 1, 'loadScenes reads them back');

    const edited: ResolvedScene[] = [
      { ...scenes[0], id: 'scene-1', index: 0, duration: 2, clipUrl: clipA },
      { ...scenes[0], id: 'scene-2', index: 1, duration: 2, clipUrl: clipB, description: 'Second angle' },
      { ...scenes[0], id: 'scene-3', index: 2, duration: 2, clipUrl: clipA, description: 'Closing shot' },
    ];
    await saveScenes(video.id, edited);

    fs.rmSync(outFile, { force: true });
    const rerenderUrl = await rerenderVideo(video.id);
    const after = await prisma.video.findUniqueOrThrow({ where: { id: video.id } });
    assert(after.status === 'COMPLETED', 're-render completed');
    assert(rerenderUrl !== url, 're-render produced a new file');

    const rerenderFile = localFile(rerenderUrl);
    const rerenderDur = probeDuration(rerenderFile);
    assert(
      Math.abs(rerenderDur - 6) < 0.6,
      `re-render honoured the edited scene durations (2+2+2 = 6s, got ${rerenderDur.toFixed(2)}s)`,
    );

    // ---- 4. Plan gate against the real DB -----------------------------------
    console.log('\n4. Checking the plan gate against real subscription rows...');
    const freeBrand = await resolveBranding(userId);
    assert(freeBrand.plan === 'free', 'a user with no subscription resolves to free');
    assert(freeBrand.watermarkText === WATERMARK_TEXT, 'free renders are watermarked');

    const now = new Date();
    const later = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    const sub = await prisma.subscription.create({
      data: { userId, plan: 'pro', status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: later },
    });
    const paidBrand = await resolveBranding(userId);
    assert(paidBrand.plan === 'pro' && paidBrand.watermarkText === null, 'an ACTIVE pro plan removes the watermark');

    // Fails closed: an expired subscription must NOT keep producing clean output.
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PAST_DUE' } });
    const lapsed = await resolveBranding(userId);
    assert(lapsed.plan === 'free' && lapsed.watermarkText === WATERMARK_TEXT, 'a PAST_DUE plan is treated as free');

    // ---- 5. Fail visibly -----------------------------------------------------
    console.log('\n5. A generation that cannot find footage must fail visibly...');
    const pexels = process.env.PEXELS_API_KEY;
    delete process.env.PEXELS_API_KEY;
    const doomed = await prisma.video.create({
      data: {
        title: 'no media, no stock',
        status: 'QUEUED',
        duration: 4,
        format: 'mp4',
        userId,
        metadata: JSON.stringify({ request: {} }),
      },
    });
    let threw = false;
    try {
      await runGeneration(doomed.id, { prompt: 'nothing to see', style: 'modern', duration: 4, addOns: [] });
    } catch {
      threw = true;
    }
    if (pexels !== undefined) process.env.PEXELS_API_KEY = pexels;

    const failed = await prisma.video.findUniqueOrThrow({ where: { id: doomed.id } });
    assert(threw, 'the pipeline threw rather than returning a placeholder');
    assert(failed.status === 'FAILED', 'the row was marked FAILED');
    const fmeta = meta(failed.metadata);
    assert(fmeta.generation?.stage === 'failed', 'progress recorded the failure');
    assert(/PEXELS_API_KEY/.test(fmeta.generation?.error ?? ''), 'the stored error explains what to configure');
    assert(!failed.url, 'no video url was written for the failed job');

    console.log('\nPASS — the pipeline works end to end against a real database.');
  } finally {
    if (userId) {
      // subscriptions_userId_fkey is RESTRICT (not CASCADE), so children must go
      // first or the user delete is rejected.
      await prisma.subscription.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.brandKit.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: userId } }).catch(() => {});
      await prisma.video.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect().catch(() => {});
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(generatedDir, { recursive: true, force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFAIL:', err.message);
    process.exit(1);
  });
