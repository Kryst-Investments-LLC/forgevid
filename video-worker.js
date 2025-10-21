// BullMQ worker for ForgeVid Hybrid Pipeline with cost tracking
// Run this in a separate Node.js process (not as an API route)

const { Worker } = require('bullmq');
const fetch = require('node-fetch');
const fs = require('fs');

const connection = {
  host: 'localhost',
  port: 6379,
};

const COST_LOG_PATH = './cost-log.json';

const worker = new Worker('video-generation', async job => {
  // Example: job.name = 'runway' | 'sdxl-animatediff' | 'upscale'
  // job.data = payload for the selected pipeline
  let result = null;
  let cost = 0;
  let apiUrl = '';

  if (job.name === 'runway') {
    apiUrl = 'http://localhost:3000/api/ai/runway';
    cost = 3.5; // Example: Runway cost per render
  } else if (job.name === 'sdxl-animatediff') {
    apiUrl = 'http://localhost:3000/api/ai/sdxl-animatediff';
    cost = 1.0; // Example: SDXL cost per render
  } else if (job.name === 'upscale') {
    apiUrl = 'http://localhost:3000/api/ai/upscale';
    cost = 0.25; // Example: Upscale cost per render
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.data),
    });
    result = await response.json();
  } catch (err) {
    result = { error: String(err) };
  }

  // Log cost and result for analytics/billing
  const logEntry = {
    jobId: job.id,
    type: job.name,
    cost,
    timestamp: new Date().toISOString(),
    result,
  };

  let log = [];
  if (fs.existsSync(COST_LOG_PATH)) {
    log = JSON.parse(fs.readFileSync(COST_LOG_PATH));
  }
  log.push(logEntry);
  fs.writeFileSync(COST_LOG_PATH, JSON.stringify(log, null, 2));

  return { result, cost };
}, { connection });

console.log('BullMQ worker with cost tracking started.');
