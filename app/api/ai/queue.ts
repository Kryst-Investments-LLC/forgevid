// BullMQ orchestration for ForgeVid Hybrid Pipeline
// Adds job queue and retry logic for video generation tasks

import { Queue, Worker, QueueScheduler, Job } from 'bullmq';
import { NextRequest, NextResponse } from 'next/server';

const connection = {
  host: 'localhost',
  port: 6379,
};

const videoQueue = new Queue('video-generation', { connection });
const scheduler = new QueueScheduler('video-generation', { connection });

// Example: POST /api/ai/queue { type, payload }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, payload } = body;
  if (!type || !payload) {
    return NextResponse.json({ error: 'Missing type or payload' }, { status: 400 });
  }

  // Add job to queue
  const job = await videoQueue.add(type, payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: true,
  });

  return NextResponse.json({ success: true, jobId: job.id });
}

// Worker example (run separately in a Node.js process)
// const worker = new Worker('video-generation', async job => {
//   // Call appropriate pipeline (Runway, SDXL, ESRGAN, etc.)
//   // Track cost, status, and result
//   return { result: 'video-url-or-data', cost: 1.25 };
// }, { connection });
