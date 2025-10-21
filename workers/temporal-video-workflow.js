// Temporal.io Workflow for ForgeVid Hybrid Pipeline
// Orchestrates video generation jobs using Temporal.io
import { Connection, Client } from '@temporalio/client';
// Define workflow interface (to be implemented in Temporal worker)
export async function videoGenerationWorkflow({ prompt, style, duration, addOns }) {
    // This is a placeholder for the actual workflow logic
    // The real workflow should be implemented in a Temporal worker (TypeScript or Go)
    // Here, you would call activities for scene parsing, video generation, upscaling, cost tracking, etc.
    return { videoUrl: 'https://example.com/generated.mp4', cost: 1.25 };
}
// Client code to start a workflow
export async function startVideoGenerationWorkflow(params) {
    const connection = await Connection.connect();
    const client = new Client({ connection });
    const handle = await client.workflow.start(videoGenerationWorkflow, {
        taskQueue: 'video-generation',
        workflowId: `video-gen-${Date.now()}`,
        args: [params],
    });
    return handle;
}
console.log('Temporal.io video-generation workflow client ready.');
