import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer, uploadVideo } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Upload video to Cloudinary and save metadata to database
 * POST /api/videos/upload
 */
async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov', 'video/avi'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Supported: mp4, webm, mov, avi' }, { status: 400 });
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size: 100MB' }, { status: 400 });
    }

    console.log('[Video Upload] Uploading file:', { name: file.name, type: file.type, size: file.size });

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    console.log('[Video Upload] Uploading to Cloudinary...');
    const uploadResult = await uploadBuffer(buffer, {
      folder: 'forgevid/user-uploads',
      resource_type: 'video',
      quality: 'auto',
      fetch_format: 'auto',
    });

    console.log('[Video Upload] Upload successful:', uploadResult.public_id);

    // Save to database
    const video = await prisma.video.create({
      data: {
        title: title || file.name,
        description: description || '',
        userId,
        url: uploadResult.secure_url,
        fileUrl: uploadResult.secure_url,
        thumbnail: uploadResult.secure_url.replace('.mp4', '.jpg').replace('.webm', '.jpg'),
        fileSize: BigInt(uploadResult.bytes),
        duration: uploadResult.duration ? Math.floor(uploadResult.duration) : null,
        resolution: uploadResult.height && uploadResult.width ? `${uploadResult.height}p` : null,
        format: uploadResult.format,
        status: 'PROCESSING',
      },
    });

    // Create analytics record
    await prisma.videoAnalytics.create({
      data: {
        videoId: video.id,
      },
    });

    console.log('[Video Upload] Video saved to database:', video.id);

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail,
        duration: video.duration,
        status: video.status,
      },
    });
  } catch (error) {
    console.error('[Video Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);

