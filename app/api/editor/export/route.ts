import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';
import { createPlaceholderVideo, exportTimelineVideo } from '@/lib/video-export';
import { uploadVideo } from '@/lib/cloudinary';
import { sendExportCompleteEmail } from '@/lib/email';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

/**
 * Editor Export API - Export edited video from timeline
 * POST: Export video from editor state
 */

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { videoId, settings } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    // Verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId, userId: session.user.id },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Get timeline state from metadata
    const projectData = video.metadata ? JSON.parse(video.metadata) : null;
    const tracks = projectData?.tracks || [];

    // Create export record
    const exportId = `export-${crypto.randomUUID()}`;
    
    // Define export settings
    const exportSettings = settings || {
      format: 'mp4' as const,
      quality: 'hd' as const,
      fps: 30,
    };

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${exportId}.${exportSettings.format}`);
    const duration = tracks.length > 0 
      ? Math.max(...tracks.flatMap((t: any) => t.clips.map((c: any) => c.startTime + c.duration))) 
      : 10;

    // Save export record to database
    const videoExport = await prisma.videoExport.create({
      data: {
        id: exportId,
        videoId: videoId,
        format: exportSettings.format,
        quality: exportSettings.quality,
        status: 'PROCESSING',
        progress: 0,
      },
    });

    // Start export in background (fire and forget for now)
    // In production, this should be handled by a job queue
    (async () => {
      try {
        console.log(`[Editor Export] Starting export ${exportId}...`);
        
        // Generate video using either real export or placeholder
        let finalVideoPath: string;
        if (tracks.length > 0) {
          // Use real video export with timeline
          finalVideoPath = await exportTimelineVideo(tracks, exportSettings, outputPath);
        } else {
          // Use placeholder for testing
          finalVideoPath = await createPlaceholderVideo(duration, outputPath, exportSettings);
        }
        
        console.log(`[Editor Export] Video rendered: ${finalVideoPath}`);
        
        // Upload to Cloudinary for CDN delivery
        let cdnUrl = finalVideoPath; // Fallback to local path if upload fails
        try {
          console.log('[Editor Export] Uploading to Cloudinary CDN...');
          const uploadResult = await uploadVideo(finalVideoPath, {
            folder: `forgevid/exports/${exportId}`,
            resource_type: 'video',
          });
          cdnUrl = uploadResult.secure_url;
          console.log('[Editor Export] CDN upload successful:', cdnUrl);
        } catch (uploadError) {
          console.error('[Editor Export] CDN upload failed, using local file:', uploadError);
        }
        
        // Clean up local file after upload
        if (fs.existsSync(finalVideoPath)) {
          fs.unlinkSync(finalVideoPath);
        }

        // Update export record with CDN URL
        await prisma.videoExport.update({
          where: { id: exportId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            fileUrl: cdnUrl, // CDN URL from Cloudinary
          },
        });

        // Send export-complete email notification
        if (session.user.email) {
          sendExportCompleteEmail(
            session.user.email,
            session.user.name || 'Creator',
            video.title || 'Untitled Video',
            cdnUrl,
            {
              duration: `${Math.round(duration)}s`,
              resolution: exportSettings.quality === 'hd' ? '1920x1080' : '1280x720',
              fileSize: 'Calculating...',
            }
          ).catch((err) => console.error('[Email] Export email failed:', err));
        }

        console.log(`[Editor Export] Export ${exportId} completed successfully`);
      } catch (error) {
        console.error(`[Editor Export] Export ${exportId} failed:`, error);
        await prisma.videoExport.update({
          where: { id: exportId },
          data: {
            status: 'FAILED',
          },
        });
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Export started',
      exportId,
      status: 'processing',
    });
  } catch (error) {
    console.error('[Editor Export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start export' },
      { status: 500 }
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);

