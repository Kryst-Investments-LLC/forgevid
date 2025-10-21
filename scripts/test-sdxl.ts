import { generateImageWithSDXL } from '../lib/video-generator';

async function main() {
  try {
    const prompt = 'A futuristic cityscape at sunset, cinematic, 4K, vibrant colors, animation';
    console.log('Testing generateImageWithSDXL with prompt:', prompt);
    const url = await generateImageWithSDXL(prompt);
    console.log('SDXL+AnimateDiff result URL:', url);
  } catch (error) {
    console.error('Error during SDXL+AnimateDiff test:', error);
    process.exit(1);
  }
}

main();
