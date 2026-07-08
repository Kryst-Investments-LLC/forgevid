/**
 * Real AI Video Generator using Stock Footage with Scene-by-Scene Matching
 * Creates actual MP4 videos from text prompts that follow the script
 * 
 * Pipeline: GPT-4 scene decomposition → Pexels stock footage → ElevenLabs voiceover → FFmpeg assembly
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { uploadVideo as uploadCloudinaryVideo } from './cloudinary';

// Dynamic imports to avoid webpack bundling issues
let ffmpeg: any;
let createClient: any;
let OpenAI: any;

// Initialize modules
async function initializeModules() {
  if (!ffmpeg) {
    const fluentFfmpeg = await import('fluent-ffmpeg');
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
    ffmpeg = fluentFfmpeg.default;
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

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

async function persistGeneratedVideo(outputPath: string, outputFilename: string): Promise<string> {
  const localUrl = `/generated/${outputFilename}`;

  if (!isCloudinaryConfigured()) {
    console.log('[Video Generator] Cloudinary not configured — keeping local generated file');
    return localUrl;
  }

  try {
    console.log('[Video Generator] Uploading generated AI video to Cloudinary...');
    const uploadResult = await uploadCloudinaryVideo(outputPath, {
      folder: 'forgevid/generated-ai-videos',
      resource_type: 'video',
    });

    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (cleanupError) {
      console.error('[Video Generator] Failed to cleanup local generated video after Cloudinary upload:', cleanupError);
    }

    console.log('[Video Generator] ✓ Generated AI video persisted to Cloudinary:', uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (uploadError) {
    console.error('[Video Generator] Cloudinary upload failed, falling back to local generated file:', uploadError);
    return localUrl;
  }
}

/**
 * Generate voiceover audio file using ElevenLabs
 * Returns path to the downloaded .mp3 file, or null if unavailable
 */
async function generateVoiceover(script: string, scenes: Scene[]): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.log('[Video Generator] No ElevenLabs API key — skipping voiceover');
    return null;
  }

  try {
    // Build a clean narration from scenes
    const narration = scenes
      .map(s => s.description)
      .join('. ')
      .replace(/\s+/g, ' ')
      .trim();

    const textToSpeak = narration.length > 20 ? narration : script.substring(0, 2000);

    console.log(`[Video Generator] Generating voiceover (${textToSpeak.length} chars)...`);

    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/ErXwobaYiN019PkySvjV',
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: textToSpeak,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.6, similarity_boost: 0.6 },
        }),
      }
    );

    if (!response.ok) {
      console.error(`[Video Generator] ElevenLabs error: ${response.status} ${response.statusText}`);
      return null;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const voiceoverPath = path.join(tempDir, `voiceover_${Date.now()}.mp3`);
    fs.writeFileSync(voiceoverPath, audioBuffer);
    console.log(`[Video Generator] ✓ Voiceover saved: ${voiceoverPath} (${(audioBuffer.length / 1024).toFixed(0)} KB)`);
    return voiceoverPath;
  } catch (error) {
    console.error('[Video Generator] Voiceover generation failed:', error);
    return null;
  }
}

/**
 * Build FFmpeg drawtext filter for scene captions
 */
function buildTextOverlayFilter(scenes: Scene[]): string {
  const filters: string[] = [];
  let currentTime = 0;

  for (const scene of scenes) {
    // Clean the description for FFmpeg (escape special chars)
    const text = scene.description
      .substring(0, 60)
      .replace(/'/g, '')
      .replace(/:/g, '\\:')
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '%%');

    const startTime = currentTime;
    const endTime = currentTime + scene.duration;

    filters.push(
      `drawtext=text='${text}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-60:enable='between(t\\,${startTime}\\,${endTime})'`
    );

    currentTime += scene.duration;
  }

  return filters.join(',');
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
      return response.videos.map((video: any) => {
        // Find the highest quality video file (prefer HD/FHD)
        const videoFiles = video.video_files || [];
        const hdFile = videoFiles.find((f: any) => f.quality === 'hd' || f.quality === 'sd' && f.width >= 1280);
        const bestFile = hdFile || videoFiles[0];
        
        return {
          url: bestFile?.link || '',
          duration: video.duration || 5,
          type: 'video' as const
        };
      }).filter((v: { url: string }) => v.url);
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
  
  const keywords = [...new Set([...words.slice(0, 3), ...(styleKeywords[style] || [])])];
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
  
  try {
    // Step 1: Parse the script into individual scenes
    console.log('[Video Generator] Step 1: Parsing script into scenes...');
    const scenes = await parseScriptIntoScenes(prompt, duration);
    
    if (scenes.length === 0) {
      throw new Error('Failed to parse script into scenes');
    }
    
    console.log(`[Video Generator] Found ${scenes.length} scenes to match`);

    // Step 2: In parallel — fetch stock footage + generate voiceover
    console.log('[Video Generator] Step 2: Fetching footage + generating voiceover in parallel...');
    const wantVoiceover = !addOns || addOns.includes('voiceover') || addOns.length === 0;
    
    const [sceneClips, voiceoverPath] = await Promise.all([
      // Fetch and download footage for each scene
      (async () => {
        const clips: Array<{ filepath: string; duration: number }> = [];
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          console.log(`[Video Generator] Processing scene ${i + 1}/${scenes.length}: ${scene.description}`);
          try {
            // Search multiple keywords to improve match quality
            let foundClip = false;
            for (const keyword of scene.keywords) {
              if (foundClip) break;
              const searchClips = await searchStockVideos(keyword, 3);
              if (searchClips.length > 0) {
                // Pick a random clip from top results for variety
                const pick = searchClips[Math.floor(Math.random() * searchClips.length)];
                const filename = `scene_${Date.now()}_${i}.mp4`;
                const filepath = await downloadFile(pick.url, filename);
                clips.push({ filepath, duration: scene.duration });
                console.log(`[Video Generator] ✓ Scene ${i + 1}: Found "${keyword}" footage`);
                foundClip = true;
              }
            }
            if (!foundClip) {
              console.log(`[Video Generator] ⚠ Scene ${i + 1}: No footage found, using fallback`);
              const fallback = getFallbackVideos('', 1)[0];
              const filename = `scene_${Date.now()}_${i}.mp4`;
              const filepath = await downloadFile(fallback.url, filename);
              clips.push({ filepath, duration: scene.duration });
            }
          } catch (error) {
            console.error(`[Video Generator] Error processing scene ${i + 1}:`, error);
          }
        }
        return clips;
      })(),
      // Generate voiceover in parallel
      wantVoiceover ? generateVoiceover(prompt, scenes) : Promise.resolve(null),
    ]);
    
    if (sceneClips.length === 0) {
      throw new Error('Failed to download any scene clips');
    }
    
    console.log(`[Video Generator] Downloaded ${sceneClips.length} scene clips`);
    if (voiceoverPath) console.log('[Video Generator] ✓ Voiceover ready');
    
    // Step 3: Trim each clip to its specified duration
    console.log('[Video Generator] Step 3: Trimming clips...');
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
              '-an',              // Strip original audio (we add voiceover later)
              '-r 30',
              '-pix_fmt yuv420p',
              '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
              '-movflags +faststart'
            ])
            .output(trimmedPath)
            .on('end', () => {
              console.log(`[Video Generator] ✓ Trimmed scene ${i + 1} to ${targetDuration}s`);
              resolve();
            })
            .on('error', (err: Error) => {
              console.error(`[Video Generator] Trim error for scene ${i + 1}:`, err);
              reject(err);
            })
            .run();
        });
        
        trimmedClips.push(trimmedPath);
      } catch (error) {
        console.error(`[Video Generator] Failed to trim scene ${i + 1}, using original`);
        trimmedClips.push(filepath);
      }
    }
    
    // Step 4: Create file list for FFmpeg concatenation
    const fileListPath = path.join(tempDir, `filelist_${Date.now()}.txt`);
    const fileListContent = trimmedClips.map(clip => `file '${clip.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);
    
    // Step 5: Assemble final video with text overlays and voiceover
    const outputFilename = `generated_video_${Date.now()}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFilename);

    // Build text overlay filter
    const wantSubtitles = !addOns || addOns.includes('subtitles') || addOns.length === 0;
    const textFilter = wantSubtitles ? buildTextOverlayFilter(scenes) : '';
    const scaleFilter = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';
    const videoFilter = textFilter ? `${scaleFilter},${textFilter}` : scaleFilter;
    
    console.log('[Video Generator] Step 5: Assembling final video...');
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()
        .input(fileListPath)
        .inputOptions(['-f concat', '-safe 0']);

      // Add voiceover as second input if available
      if (voiceoverPath) {
        command.input(voiceoverPath);
      }

      const outputOptions = [
        '-c:v libx264',
        '-preset slow',
        '-crf 18',
        '-r 30',
        '-pix_fmt yuv420p',
        '-vf', videoFilter,
        '-movflags +faststart',
        '-max_muxing_queue_size 1024',
      ];

      if (voiceoverPath) {
        // Mix voiceover: use voiceover audio, trim to video length
        outputOptions.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
      } else {
        outputOptions.push('-an'); // No audio
      }

      command
        .outputOptions(outputOptions)
        .output(outputPath)
        .on('start', () => {
          console.log('[Video Generator] FFmpeg assembly started');
        })
        .on('progress', (progress: any) => {
          console.log(`[Video Generator] Assembly progress: ${progress.percent?.toFixed(1) || 0}%`);
        })
        .on('end', () => {
          console.log('[Video Generator] ✅ Video assembly complete!');
          resolve();
        })
        .on('error', (err: Error) => {
          console.error('[Video Generator] FFmpeg assembly error:', err);
          reject(err);
        })
        .run();
    });
    
    // Step 6: Clean up temp files
    console.log('[Video Generator] Step 6: Cleaning up temporary files...');
    const filesToClean = [
      ...sceneClips.map(c => c.filepath),
      ...trimmedClips,
      fileListPath,
      ...(voiceoverPath ? [voiceoverPath] : []),
    ];
    filesToClean.forEach(file => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (error) {
        console.error('[Video Generator] Cleanup error:', error);
      }
    });
    
    // Persist final generated video to Cloudinary when configured.
    const publicUrl = await persistGeneratedVideo(outputPath, outputFilename);
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

