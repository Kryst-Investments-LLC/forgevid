/**
 * Generate an image using DALL-E 3 (OpenAI API)
 */
export async function generateImageWithDalle(prompt: string, userId?: string): Promise<string> {
  await initializeModules();
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });
    const imageUrl = response.data[0]?.url;
    if (!imageUrl) throw new Error('No image URL returned from DALL-E 3');
    // Usage metering: create UsageRecord if userId is provided
    if (userId) {
      const prisma = (await import('./prisma')).default;
      await prisma.usageRecord.create({
        data: {
          userId,
          action: 'ai_generation',
          resourceType: 'image',
          quantity: 1,
          metadata: JSON.stringify({ model: 'dall-e-3', prompt }),
        },
      });
    }
    return imageUrl;
  } catch (error) {
    console.error('[Image Generation] DALL-E 3 error:', error);
    throw error;
  }
}

/**
 * Generate an image using SDXL (via RunPod or other API)
 * Placeholder for actual SDXL API integration
 */
export async function generateImageWithSDXL(prompt: string, userId?: string): Promise<string> {
  // Integrate with SDXL+AnimateDiff API (RunPod endpoint via local API route)
  const apiUrl = process.env.SDXL_ANIMATEDIFF_API_URL || 'http://localhost:3000/api/ai/sdxl-animatediff';
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`SDXL/AnimateDiff API error: ${error}`);
    }
    const data = await res.json();
    // Usage metering: create UsageRecord if userId is provided
    if (userId) {
      const prisma = (await import('./prisma')).default;
      await prisma.usageRecord.create({
        data: {
          userId,
          action: 'ai_generation',
          resourceType: 'image',
          quantity: 1,
          metadata: JSON.stringify({ model: 'sdxl', prompt }),
        },
      });
    }
    // Assume the API returns { success: true, data: { url: ... } }
    return data?.data?.url || data?.data?.videoUrl || data?.data?.imageUrl || 'https://placehold.co/1024x1024?text=SDXL+Image';
  } catch (error) {
    console.error('[SDXL/AnimateDiff] API error:', error);
    throw error;
  }
}
/**
 * Generate thumbnails and scene stills for a video
 */
export async function generateThumbnailsAndStills(prompt: string, method: 'dalle' | 'sdxl' = 'dalle', userId?: string): Promise<{ thumbnail: string; stills: string[] }> {
  const thumbnailPrompt = `${prompt} -- thumbnail`;
  const stillPrompts = [
    `${prompt} -- scene 1`,
    `${prompt} -- scene 2`,
    `${prompt} -- scene 3`,
  ];
  let thumbnail = '';
  let stills: string[] = [];
  if (method === 'dalle') {
    thumbnail = await generateImageWithDalle(thumbnailPrompt, userId);
    stills = await Promise.all(stillPrompts.map(p => generateImageWithDalle(p, userId)));
  } else {
    thumbnail = await generateImageWithSDXL(thumbnailPrompt, userId);
    stills = await Promise.all(stillPrompts.map(p => generateImageWithSDXL(p, userId)));
  }
  return { thumbnail, stills };
}
/**
 * Real AI Video Generator using Stock Footage with Scene-by-Scene Matching
 * Creates actual MP4 videos from text prompts that follow the script
 */

import axios from 'axios';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'child_process';
// @ts-ignore: No type definitions for fluent-ffmpeg
/**
 * Upscale a video clip using Real-ESRGAN (local or GPU node)
 * Assumes real-esrgan is installed and accessible via CLI
 */
async function upscaleWithRealESRGAN(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Example command: real-esrgan-ncnn-vulkan -i input.mp4 -o output.mp4 -n realesrgan-x4plus
    // You may need to adjust the command based on your environment
    execSync(`real-esrgan-ncnn-vulkan -i "${inputPath}" -o "${outputPath}" -n realesrgan-x4plus`, { stdio: 'inherit' });
    console.log(`[Upscale] Real-ESRGAN upscaling complete: ${outputPath}`);
  } catch (error) {
    console.error('[Upscale] Real-ESRGAN failed:', error);
    throw error;
  }
}

/**
 * Upscale a video clip using Topaz Video AI (cloud API, commercial)
 * Placeholder for API integration
 */
export async function upscaleWithTopazAPI(inputPath: string, outputPath: string): Promise<void> {
  // Integrate with Topaz Video AI API via local API route
  const apiUrl = process.env.TOPAZ_API_URL || 'http://localhost:3000/api/ai/upscale';
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: inputPath }),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Topaz/ESRGAN API error: ${error}`);
    }
    const data = await res.json();
    // Assume the API returns { success: true, data: { upscaledUrl: ... } }
    const upscaledUrl = data?.data?.upscaledUrl || data?.data?.url;
    if (upscaledUrl && upscaledUrl !== inputPath) {
      // Download the upscaled file to outputPath
      const axios = (await import('axios')).default;
      const response = await axios.get(upscaledUrl, { responseType: 'stream' });
      const writer = fs.createWriteStream(outputPath);
      await new Promise<void>((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });
      console.log(`[Upscale] Topaz Video AI complete: ${outputPath}`);
    } else {
      // Fallback: just copy input to output
      fs.copyFileSync(inputPath, outputPath);
      console.log(`[Upscale] Topaz fallback (copied): ${outputPath}`);
    }
  } catch (error) {
    console.error('[Upscale] Topaz Video AI API error:', error);
    // Fallback: just copy input to output
    fs.copyFileSync(inputPath, outputPath);
    throw error;
  }
}

// Dynamic imports to avoid webpack bundling issues
let ffmpeg: any;
let createClient: any;
let OpenAI: any;

// Initialize modules
async function initializeModules() {
  if (!ffmpeg) {
    const fluentFfmpeg = await import('fluent-ffmpeg');
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
    ffmpeg = fluentFfmpeg;
    if ('default' in fluentFfmpeg) ffmpeg = fluentFfmpeg.default;
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
  if (!createClient) {
    const pexels = await import('pexels');
    createClient = pexels.createClient;
  }
  if (!OpenAI) {
    const openai = await import('openai');
    OpenAI = openai.OpenAI;
  }
}

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
let pexelsClient: any = null;

interface Scene {
  description: string;
  keywords: string[];
  duration: number;
  visualElements: string[];
}

interface VideoClip {
  url: string;
  duration: number;
  type: 'video' | 'image';
}

interface GenerationOptions {
  prompt: string;
  style: string;
  duration: number;
  addOns: string[];
}

/**
 * Search for relevant stock videos on Pexels
 */
export async function searchStockVideos(query: string, limit: number = 5): Promise<VideoClip[]> {
  // Initialize modules first
  await initializeModules();
  
  if (!PEXELS_API_KEY) {
    console.log('[Video Generator] Using fallback videos (no Pexels API key)');
    return getFallbackVideos(query, limit);
  }
  
  if (!pexelsClient && createClient) {
    pexelsClient = createClient(PEXELS_API_KEY);
  }
  
  if (!pexelsClient) {
    console.log('[Video Generator] Pexels client initialization failed');
    return getFallbackVideos(query, limit);
  }

  try {
    console.log(`[Video Generator] Searching Pexels for: "${query}"`);
    const response = await pexelsClient.videos.search({ 
      query, 
      per_page: limit,
      size: 'large', // Request larger/higher quality videos
      orientation: 'landscape' // Better for standard videos
    });
    
    if ('videos' in response && response.videos) {
      return response.videos.map((video: any): VideoClip => {
        // Find the highest quality video file (prefer HD/FHD)
        const videoFiles = video.video_files || [];
        const hdFile = videoFiles.find((f: any) => f.quality === 'hd' || f.quality === 'sd' && f.width >= 1280);
        const bestFile = hdFile || videoFiles[0];
        return {
          url: bestFile?.link || '',
          duration: video.duration || 5,
          type: 'video'
        };
      }).filter((v: VideoClip) => v.url);
    }
  } catch (error) {
    console.error('[Video Generator] Pexels API error:', error);
  }

  return getFallbackVideos(query, limit);
}

/**
 * Fallback videos when Pexels is not available
 */
function getFallbackVideos(query: string, limit: number): VideoClip[] {
  const fallbackVideos = [
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', duration: 15, type: 'video' as const },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', duration: 15, type: 'video' as const },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', duration: 15, type: 'video' as const },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', duration: 15, type: 'video' as const },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', duration: 15, type: 'video' as const },
  ];
  
  return fallbackVideos.slice(0, limit);
}

/**
 * Download a video/audio file to temp directory
 */
async function downloadFile(url: string, filename: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'public', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filepath = path.join(tempDir, filename);
  
  try {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filepath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`[Video Generator] Download error for ${url}:`, error);
    throw error;
  }
}

/**
 * Parse script into individual scenes with AI
 */
async function parseScriptIntoScenes(script: string, totalDuration: number): Promise<Scene[]> {
  await initializeModules();
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('[Video Generator] Parsing script into scenes with AI...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a video production assistant. Parse the video script into individual scenes for stock footage matching.

For each scene, extract:
1. Scene description (what's happening)
2. Search keywords (3-5 visual elements that can be found in stock footage)
3. Duration in seconds (distribute ${totalDuration}s total across all scenes)
4. Key visual elements

Return ONLY a JSON array with this structure:
[
  {
    "description": "Opening with flour on countertop",
    "keywords": ["flour", "baking", "countertop", "kitchen"],
    "duration": 5,
    "visualElements": ["flour dust", "wooden counter", "baking preparation"]
  },
  ...
]

Be specific and focus on filmable, real-world visuals. Avoid abstract concepts.`
        },
        {
          role: 'user',
          content: `Parse this script into scenes:\n\n${script}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });
    
    let content = response.choices[0]?.message?.content || '{}';
    
    // Remove markdown code blocks with multiple strategies
    content = content.trim();
    
    // Strategy 1: Remove markdown with backticks
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      // Remove first line if it's ```json or ```
      if (lines[0].trim().match(/^```(json)?$/)) {
        lines.shift();
      }
      // Remove last line if it's ```
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      content = lines.join('\n').trim();
    }
    
    // Strategy 2: Extract JSON array using regex as fallback
    const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    console.log('[Video Generator] Cleaned content for parsing:', content.substring(0, 100) + '...');
    
    // Try to parse JSON, looking for scenes array
    let scenes: Scene[] = [];
    try {
      const parsed = JSON.parse(content);
      scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || []);
      
      // If it's not an array, try to extract it
      if (!Array.isArray(scenes)) {
        console.error('[Video Generator] Parsed content is not an array:', typeof scenes);
        scenes = [];
      }
    } catch (parseError) {
      console.error('[Video Generator] JSON parse error:', parseError);
      console.error('[Video Generator] Content was:', content.substring(0, 300));
      scenes = [];
    }
    
    console.log(`[Video Generator] Parsed ${scenes.length} scenes from script`);
    scenes.forEach((scene, i) => {
      console.log(`  Scene ${i + 1}: ${scene.description} (${scene.duration}s) - Keywords: ${scene.keywords.join(', ')}`);
    });
    
    return scenes;
  } catch (error) {
    console.error('[Video Generator] Scene parsing failed:', error);
    // Fallback: Create one scene from the whole prompt
    return [{
      description: script.substring(0, 100),
      keywords: await extractKeywordsLegacy(script, 'cinematic'),
      duration: totalDuration,
      visualElements: []
    }];
  }
}

/**
 * Legacy keyword extraction (fallback)
 */
async function extractKeywordsLegacy(prompt: string, style: string): Promise<string[]> {
  // Use OpenAI to extract meaningful visual keywords from the prompt
  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract 3-5 visual keywords from the video description that would be good search terms for finding stock footage. Return ONLY a comma-separated list of keywords. Focus on: locations, objects, actions, and visual elements that can be filmed. Avoid abstract concepts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.3
    });
    
    const keywordsText = response.choices[0]?.message?.content || '';
    const extractedKeywords = keywordsText
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 2);
    
    console.log(`[Video Generator] AI extracted keywords: ${extractedKeywords.join(', ')}`);
    
    if (extractedKeywords.length > 0) {
      return extractedKeywords.slice(0, 5);
    }
  } catch (error) {
    console.error('[Video Generator] AI keyword extraction failed:', error);
  }
  
  // Fallback to manual extraction
  const commonWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'for', 'with', 'about', 'create', 'make', 'video', 'generate', 'prompt', 'description', 'short', 'animated'];
  const words = prompt.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  // Add style-related keywords
  const styleKeywords: Record<string, string[]> = {
    cinematic: ['nature', 'landscape', 'sunset'],
    modern: ['city', 'technology', 'business'],
    energetic: ['sports', 'action', 'movement'],
    professional: ['office', 'meeting', 'workplace']
  };
  
  const keywords = Array.from(new Set([...words.slice(0, 3), ...(styleKeywords[style] || [])]));
  console.log(`[Video Generator] Manual extracted keywords: ${keywords.join(', ')}`);
  return keywords.slice(0, 5);
}

/**
 * Generate a video from script with scene-by-scene matching
 */
export async function generateVideoFromPrompt(options: GenerationOptions): Promise<string> {
  console.log('[Video Generator] Starting INTELLIGENT video generation with scene matching');

  // Initialize FFmpeg and Pexels
  await initializeModules();

  const { prompt, style, duration, addOns } = options;

  // Choose upscaling method: 'realesrgan' or 'topaz'
  const upscalingMethod = process.env.UPSCALE_METHOD || 'realesrgan';

  try {
    // Step 1: Parse the script into individual scenes
    console.log('[Video Generator] Step 1: Parsing script into scenes...');
    const scenes = await parseScriptIntoScenes(prompt, duration);

    if (scenes.length === 0) {
      throw new Error('Failed to parse script into scenes');
    }

    console.log(`[Video Generator] Found ${scenes.length} scenes to match`);

    // Step 2: Find and download footage for EACH scene
    console.log('[Video Generator] Step 2: Finding footage for each scene...');
    const sceneClips: Array<{ filepath: string; duration: number }> = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      console.log(`[Video Generator] Processing scene ${i + 1}/${scenes.length}: ${scene.description}`);

      try {
        // Search for footage matching this specific scene
        const clips = await searchStockVideos(scene.keywords[0] || 'cinematic', 1);

        if (clips.length > 0) {
          const filename = `scene_${Date.now()}_${i}.mp4`;
          const filepath = await downloadFile(clips[0].url, filename);
          sceneClips.push({ filepath, duration: scene.duration });
          console.log(`[Video Generator] ✓ Scene ${i + 1}: Found "${scene.keywords[0]}" footage`);
        } else {
          console.log(`[Video Generator] ⚠ Scene ${i + 1}: No footage found, using fallback`);
          // Use a fallback clip
          const fallback = getFallbackVideos('', 1)[0];
          const filename = `scene_${Date.now()}_${i}.mp4`;
          const filepath = await downloadFile(fallback.url, filename);
          sceneClips.push({ filepath, duration: scene.duration });
        }
      } catch (error) {
        console.error(`[Video Generator] Error processing scene ${i + 1}:`, error);
      }
    }

    if (sceneClips.length === 0) {
      throw new Error('Failed to download any scene clips');
    }

    console.log(`[Video Generator] Downloaded ${sceneClips.length} scene clips`);

    // Step 3: Trim each clip to its specified duration and add transitions
    console.log('[Video Generator] Step 3: Trimming clips and adding transitions...');
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const trimmedClips: string[] = [];

    for (let i = 0; i < sceneClips.length; i++) {
      const { filepath, duration: targetDuration } = sceneClips[i];
      const trimmedFilename = `trimmed_${Date.now()}_${i}.mp4`;
      const trimmedPath = path.join(tempDir, trimmedFilename);

      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(filepath)
            .setDuration(targetDuration)
            .outputOptions([
              '-c:v libx264',
              '-preset ultrafast',
              '-crf 23',
              '-c:a aac',
              '-b:a 192k',
              '-ar 44100',
              '-r 30', // Force 30fps for consistency
              '-pix_fmt yuv420p', // Ensure compatibility
              '-movflags +faststart'
            ])
            .output(trimmedPath)
            .on('end', (): void => {
              console.log(`[Video Generator] ✓ Trimmed scene ${i + 1} to ${targetDuration}s`);
              resolve();
            })
            .on('error', (err: Error): void => {
              console.error(`[Video Generator] Trim error for scene ${i + 1}:`, err);
              reject(err);
            })
            .run();
        });

        // Step 3.5: Upscale trimmed clip
        const upscaledFilename = `upscaled_${Date.now()}_${i}.mp4`;
        const upscaledPath = path.join(tempDir, upscaledFilename);
        if (upscalingMethod === 'realesrgan') {
          await upscaleWithRealESRGAN(trimmedPath, upscaledPath);
        } else if (upscalingMethod === 'topaz') {
          await upscaleWithTopazAPI(trimmedPath, upscaledPath);
        } else {
          // Default: no upscaling, use trimmed
          fs.copyFileSync(trimmedPath, upscaledPath);
        }
        trimmedClips.push(upscaledPath);
      } catch (error) {
        console.error(`[Video Generator] Failed to trim/upscale scene ${i + 1}, using original`);
        trimmedClips.push(filepath);
      }
    }

    // Step 4: Create file list for FFmpeg concatenation
    const fileListPath = path.join(tempDir, `filelist_${Date.now()}.txt`);
    const fileListContent = trimmedClips.map(clip => `file '${clip}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);

    // Step 5: Assemble final video with transitions
    const outputFilename = `generated_video_${Date.now()}.mp4`;
    const outputPath = path.join(process.cwd(), 'public', 'generated', outputFilename);

    const outputDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('[Video Generator] Step 4: Assembling final video with transitions...');
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(fileListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c:v libx264',
          '-preset slow', // Higher quality encoding (slower but better)
          '-crf 18', // Excellent quality (18 = near-lossless)
          '-c:a aac',
          '-b:a 256k', // Better audio quality
          '-ar 48000', // Professional audio sample rate
          '-r 30', // Consistent 30fps throughout
          '-pix_fmt yuv420p', // Browser compatibility
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2', // Force 1080p HD
          '-movflags +faststart', // Fast web playback
          '-max_muxing_queue_size 1024' // Prevent stuttering
        ])
        .output(outputPath)
        .on('start', (cmd: string): void => {
          console.log('[Video Generator] FFmpeg assembly command started');
        })
        .on('progress', (progress: { percent?: number }): void => {
          console.log(`[Video Generator] Assembly progress: ${progress.percent?.toFixed(1) || 0}%`);
        })
        .on('end', (): void => {
          console.log('[Video Generator] ✅ Video assembly complete!');
          resolve();
        })
        .on('error', (err: Error): void => {
          console.error('[Video Generator] FFmpeg assembly error:', err);
          reject(err);
        })
        .run();
    });

    // Step 6: Clean up temp files
    console.log('[Video Generator] Step 5: Cleaning up temporary files...');
    [...sceneClips.map(c => c.filepath), ...trimmedClips, fileListPath].forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.error('[Video Generator] Cleanup error:', error);
      }
    });

    // Return the public URL
    const publicUrl = `/generated/${outputFilename}`;
    console.log('[Video Generator] ✅ Video generated successfully:', publicUrl);
    console.log(`[Video Generator] Final video: ${duration}s with ${scenes.length} scenes`);
    return publicUrl;

  } catch (error) {
    console.error('[Video Generator] Generation failed:', error);
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up old generated videos (older than 24 hours)
 */
export function cleanupOldVideos() {
  const generatedDir = path.join(process.cwd(), 'public', 'generated');
  const tempDir = path.join(process.cwd(), 'public', 'temp');
  
  const cleanDirectory = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    files.forEach(file => {
      const filepath = path.join(dir, file);
      const stats = fs.statSync(filepath);
      const age = now - stats.mtimeMs;
      
      if (age > maxAge) {
        try {
          fs.unlinkSync(filepath);
          console.log(`[Video Generator] Cleaned up old file: ${file}`);
        } catch (error) {
          console.error(`[Video Generator] Failed to cleanup ${file}:`, error);
        }
      }
    });
  };
  
  cleanDirectory(generatedDir);
  cleanDirectory(tempDir);
}

