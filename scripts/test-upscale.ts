import { upscaleWithTopazAPI } from '../lib/video-generator';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    // Use a small sample video file for testing
    const sampleInput = path.join(process.cwd(), 'public', 'temp', 'sample-input.mp4');
    const sampleOutput = path.join(process.cwd(), 'public', 'temp', 'sample-upscaled.mp4');

    if (!fs.existsSync(sampleInput)) {
      console.error('Sample input video not found:', sampleInput);
      process.exit(1);
    }

    console.log('Testing upscaleWithTopazAPI with input:', sampleInput);
    await upscaleWithTopazAPI(sampleInput, sampleOutput);
    console.log('Upscaled video saved to:', sampleOutput);
  } catch (error) {
    console.error('Error during Topaz upscaling test:', error);
    process.exit(1);
  }
}

main();
