/**
 * Video Export Pipeline for Editor
 * Renders timeline state to final video using FFmpeg
 */

import fs from 'fs';
import path from 'path';

// Dynamic FFmpeg import
let ffmpeg: any;

async function getFFmpeg() {
  if (!ffmpeg) {
    const fluentFfmpeg = await import('fluent-ffmpeg');
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
    ffmpeg = fluentFfmpeg.default;
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
  return ffmpeg;
}

interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm';
  quality: 'hd' | '4k' | 'sd';
  fps: number;
  bitrate?: string;
  resolution?: string;
  preset?: 'social-youtube' | 'social-tiktok' | 'social-instagram' | 'social-facebook' | 'social-twitter' | 'social-linkedin' | 'custom';
}

interface TimelineClip {
  id: string;
  assetId: string;
  startTime: number;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
}

interface EditorTrack {
  id: string;
  type: 'video' | 'audio' | 'text';
  clips: TimelineClip[];
}

/**
 * Get FFmpeg encoding settings based on export quality and preset
 */
function getEncodingSettings(quality: string, format: string, fps: number, preset?: ExportSettings['preset']) {
  const settings: any = {
    fps,
    videoCodec: format === 'webm' ? 'libvpx-vp9' : 'libx264',
    audioCodec: format === 'webm' ? 'libopus' : 'aac',
    // Default preset for FFmpeg
    ffmpegPreset: 'medium', 
  };

  // Apply social media presets
  switch (preset) {
    case 'social-youtube':
      return { ...settings, size: '1920x1080', aspectRatio: '16:9', videoBitrate: '8M', audioBitrate: '192k', ffmpegPreset: 'fast' };
    case 'social-tiktok':
      return { ...settings, size: '1080x1920', aspectRatio: '9:16', videoBitrate: '5M', audioBitrate: '128k', ffmpegPreset: 'fast' };
    case 'social-instagram':
      return { ...settings, size: '1080x1080', aspectRatio: '1:1', videoBitrate: '5M', audioBitrate: '128k', ffmpegPreset: 'fast' };
    case 'social-facebook':
      return { ...settings, size: '1920x1080', aspectRatio: '16:9', videoBitrate: '6M', audioBitrate: '160k', ffmpegPreset: 'fast' };
    case 'social-twitter':
      return { ...settings, size: '1280x720', aspectRatio: '16:9', videoBitrate: '4M', audioBitrate: '128k', ffmpegPreset: 'fast' };
    case 'social-linkedin':
      return { ...settings, size: '1920x1080', aspectRatio: '16:9', videoBitrate: '6M', audioBitrate: '160k', ffmpegPreset: 'fast' };
    case 'custom':
      // Fall through to quality-based settings
      break;
    default:
      // Fall through to quality-based settings
      break;
  }

  // Apply quality-based settings if no social preset or custom
  switch (quality) {
    case '4k':
      return {
        ...settings,
        size: '3840x2160',
        videoBitrate: '20M',
        audioBitrate: '192k',
        preset: 'slow',
      };
    case 'hd':
      return {
        ...settings,
        size: '1920x1080',
        videoBitrate: '5M',
        audioBitrate: '128k',
        preset: 'medium',
      };
    case 'sd':
    default:
      return {
        ...settings,
        size: '1280x720',
        videoBitrate: '2M',
        audioBitrate: '96k',
        preset: 'fast',
      };
  }
}

/**
 * Export video from timeline state
 */
export async function exportTimelineVideo(
  tracks: EditorTrack[],
  settings: ExportSettings,
  outputPath: string
): Promise<string> {
  console.log('[Video Export] Starting export pipeline...');
  
  const ffmpegInstance = await getFFmpeg();
  
  return new Promise((resolve, reject) => {
    try {
      const command = ffmpegInstance();
      const encodingSettings = getEncodingSettings(settings.quality, settings.format, settings.fps, settings.preset);

      // Separate video and audio tracks
      const videoTracks = tracks.filter(t => t.type === 'video');
      const audioTracks = tracks.filter(t => t.type === 'audio');

      console.log(`[Video Export] Processing ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);

      // Add video tracks
      videoTracks.forEach((track, trackIndex) => {
        track.clips.forEach((clip, clipIndex) => {
          // Note: In real implementation, clip.assetId would be a file path
          // For now, we'll assume clips have file paths
          const inputPath = clip.assetId; // Should be a file path to video asset
          
          if (fs.existsSync(inputPath)) {
            command.input(inputPath);
            
            // Apply trimming if specified
            if (clip.trimStart || clip.trimEnd) {
              const start = clip.trimStart || 0;
              const duration = clip.duration - (clip.trimEnd || 0) - start;
              command.seekInput(start);
              command.duration(duration);
            }
          }
        });
      });

      // Add audio tracks
      audioTracks.forEach((track, trackIndex) => {
        track.clips.forEach((clip) => {
          const inputPath = clip.assetId; // Should be a file path to audio asset
          
          if (fs.existsSync(inputPath)) {
            command.input(inputPath);
            
            // Apply trimming if specified
            if (clip.trimStart || clip.trimEnd) {
              const start = clip.trimStart || 0;
              const duration = clip.duration - (clip.trimEnd || 0) - start;
              command.seekInput(start);
              command.duration(duration);
            }
          }
        });
      });

      // Complex filter for layering clips
      const videoFilter = videoTracks.flatMap((track, ti) =>
        track.clips.map((clip, ci) => {
          const inputIndex = ci + (ti * videoTracks.length);
          return `[${inputIndex}:v]scale=${encodingSettings.size},setpts=PTS-STARTPTS[v${ti}${ci}]`;
        })
      ).join('; ');

      const audioFilter = audioTracks.flatMap((track, ti) =>
        track.clips.map((clip, ci) => {
          return `[${ci}:a]asetpts=PTS-STARTPTS[a${ti}${ci}]`;
        })
      ).join('; ');

      // Apply filters
      if (videoFilter) {
        command.complexFilter(videoFilter);
      }
      if (audioFilter) {
        command.complexFilter(audioFilter);
      }

      // Set output options
      command
        .videoCodec(encodingSettings.videoCodec)
        .audioCodec(encodingSettings.audioCodec)
        .videoBitrate(encodingSettings.videoBitrate)
        .audioBitrate(encodingSettings.audioBitrate)
        .size(encodingSettings.size)
        .fps(encodingSettings.fps)
        .format(settings.format)
        .outputOptions(`-preset ${encodingSettings.preset}`)
        .output(outputPath);

      // Progress tracking
      command.on('progress', (progress: any) => {
        const percent = progress.percent || 0;
        console.log(`[Video Export] Progress: ${percent.toFixed(1)}%`);
      });

      command.on('end', () => {
        console.log('[Video Export] Export completed successfully');
        resolve(outputPath);
      });

      command.on('error', (err: Error, stdout: string, stderr: string) => {
        console.error('[Video Export] Export failed:', err);
        console.error('[Video Export] FFmpeg stderr:', stderr);
        reject(new Error(`Export failed: ${err.message}`));
      });

      command.run();
    } catch (error) {
      console.error('[Video Export] Setup error:', error);
      reject(error);
    }
  });
}

/**
 * Create a simple placeholder video for testing
 */
export async function createPlaceholderVideo(
  duration: number,
  outputPath: string,
  settings: ExportSettings
): Promise<string> {
  console.log('[Video Export] Creating placeholder video...');
  
  const ffmpegInstance = await getFFmpeg();
  
  return new Promise((resolve, reject) => {
    const encodingSettings = getEncodingSettings(settings.quality, settings.format, settings.fps);
    
    const command = ffmpegInstance()
      .input('color=color=blue:size=1920x1080:duration=' + duration)
      .inputFormat('lavfi')
      .videoCodec(encodingSettings.videoCodec)
      .audioCodec(encodingSettings.audioCodec)
      .videoBitrate(encodingSettings.videoBitrate)
      .audioBitrate(encodingSettings.audioBitrate)
      .size(encodingSettings.size)
      .fps(encodingSettings.fps)
      .format(settings.format)
      .outputOptions(`-preset ${encodingSettings.preset}`)
      .output(outputPath);

    command.on('end', () => {
      console.log('[Video Export] Placeholder created successfully');
      resolve(outputPath);
    });

    command.on('error', (err: Error) => {
      console.error('[Video Export] Placeholder creation failed:', err);
      reject(err);
    });

    command.run();
  });
}

