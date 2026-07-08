/**
 * Standalone BullMQ worker for video generation.
 *
 * Run separately from the Next.js server:  npm run worker
 * Requires REDIS_URL (plus the same OPENAI/PEXELS/ELEVENLABS/CLOUDINARY/DATABASE
 * env the app uses). If REDIS_URL is not set, generation runs inline in the API
 * route instead and this worker is not needed.
 *
 * Env is loaded via @next/env (same .env.local resolution as Next), and the
 * queue/pipeline modules are imported dynamically AFTER env load so their reads
 * see the configured values.
 */

import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  const { Worker } = await import('bullmq');
  const { getRedisConnection, GENERATION_QUEUE_NAME } = await import('../lib/video-queue');
  const { runGeneration } = await import('../lib/generation-pipeline');

  const connection = getRedisConnection();
  if (!connection) {
    console.error('[worker] REDIS_URL is not set — cannot start the generation worker.');
    process.exit(1);
  }

  const concurrency = Number(process.env.WORKER_CONCURRENCY || 2);

  const worker = new Worker<import('../lib/video-queue').GenerationJobData>(
    GENERATION_QUEUE_NAME,
    async (job) => {
      const { videoId, input } = job.data;
      console.log(`[worker] job ${job.id} generating video ${videoId}`);
      const url = await runGeneration(videoId, input);
      console.log(`[worker] job ${job.id} done -> ${url}`);
      return { url };
    },
    { connection, concurrency },
  );

  worker.on('completed', (job) => console.log(`[worker] completed ${job.id}`));
  worker.on('failed', (job, err) =>
    console.error(`[worker] failed ${job?.id}: ${err?.message}`),
  );

  console.log(`[worker] listening on "${GENERATION_QUEUE_NAME}" (concurrency ${concurrency})`);

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, closing...`);
    await worker.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
