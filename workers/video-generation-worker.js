// BullMQ Worker for ForgeVid Hybrid Pipeline
// Processes video generation jobs from the queue
// BullMQ Worker for ForgeVid Hybrid Pipeline (legacy)
import { Worker as BullWorker } from 'bullmq';
import { generateVideoFromPrompt } from '../lib/video-generator.js';
const connection = {
    host: 'localhost',
    port: 6379,
};
const bullWorker = new BullWorker('video-generation', async (job) => {
    try {
        // Example payload: { prompt, style, duration, addOns }
        const { prompt, style, duration, addOns } = job.data;
        const videoUrl = await generateVideoFromPrompt({ prompt, style, duration, addOns });
        // TODO: Track cost, update status, log analytics
        return { videoUrl, cost: 1.25 };
    }
    catch (error) {
        // TODO: Error handling, alerting, retries
        throw error;
    }
}, { connection });
bullWorker.on('completed', job => {
    console.log(`[BullMQ Worker] Job ${job.id} completed:`, job.returnvalue);
});
bullWorker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err);
});
// Temporal.io Worker for ForgeVid Hybrid Pipeline
import { Worker as TemporalWorker } from '@temporalio/worker';
import * as activities from './video-generation-activities.js';
async function runTemporalWorker() {
    const worker = await TemporalWorker.create({
        workflowsPath: require.resolve('./temporal-video-workflow'),
        activities,
        taskQueue: 'video-generation',
    });
    await worker.run();
}
runTemporalWorker().catch((err) => {
    console.error('Temporal worker failed:', err);
});
console.log('BullMQ and Temporal.io video-generation workers started.');
