import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function downloadSampleVideo() {
  const url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
  const outputPath = path.join(process.cwd(), 'public', 'temp', 'sample-input.mp4');
  const writer = fs.createWriteStream(outputPath);
  const response = await axios.get(url, { responseType: 'stream' });
  response.data.pipe(writer);
  await new Promise<void>((resolve, reject) => {
    writer.on('finish', () => resolve());
    writer.on('error', reject);
  });
  console.log('Sample video downloaded to:', outputPath);
}

downloadSampleVideo();
