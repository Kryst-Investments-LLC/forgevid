import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus, TemplateCategory, MediaType } from '@prisma/client';

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Create or update admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@forgevid.com' },
    update: {},
    create: {
      email: 'admin@forgevid.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created/updated admin user');

  // Create or update sample organization
  const org = await prisma.organization.upsert({
    where: { domain: 'demo.forgevid.com' },
    update: {},
    create: {
      name: 'ForgeVid Demo Org',
      domain: 'demo.forgevid.com',
      settings: JSON.stringify({ theme: 'light', features: ['ai', 'collaboration'] }),
    },
  });
  console.log('✅ Created/updated sample organization');

  // Create or update sample templates
  const templates = await Promise.all([
    prisma.template.upsert({
      where: { name: 'Business Presentation' },
      update: {},
      create: {
        name: 'Business Presentation',
        description: 'Professional template for business presentations',
        category: TemplateCategory.BUSINESS,
        duration: 60,
        aspectRatio: '16:9',
        resolution: '1080p',
        tags: JSON.stringify(['business', 'professional', 'presentation']),
        thumbnail: 'https://example.com/business-template.jpg',
        templateData: JSON.stringify({ 
          scenes: [
            { type: 'title', duration: 5 },
            { type: 'content', duration: 50 },
            { type: 'outro', duration: 5 }
          ]
        }),
        createdById: adminUser.id,
      },
    }),
    prisma.template.upsert({
      where: { name: 'Social Media Post' },
      update: {},
      create: {
        name: 'Social Media Post',
        description: 'Eye-catching template for social media content',
        category: TemplateCategory.SOCIAL,
        duration: 15,
        aspectRatio: '9:16',
        resolution: '1080p',
        tags: JSON.stringify(['social', 'instagram', 'tiktok']),
        thumbnail: 'https://example.com/social-template.jpg',
        templateData: JSON.stringify({
          scenes: [
            { type: 'hook', duration: 3 },
            { type: 'content', duration: 10 },
            { type: 'cta', duration: 2 }
          ]
        }),
        createdById: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Created/updated sample templates');

  // Create or update sample media assets
  const mediaAssets = await Promise.all([
    prisma.mediaAsset.upsert({
      where: { name: 'Demo Video Background' },
      update: {},
      create: {
        name: 'Demo Video Background',
        fileName: 'demo-bg.mp4',
        type: MediaType.VIDEO,
        url: 'https://example.com/demo-bg.mp4',
        thumbnail: 'https://example.com/demo-bg-thumb.jpg',
        duration: 30,
        fileSize: BigInt(5000000),
        resolution: '1920x1080',
        metadata: JSON.stringify({ fps: 30, codec: 'h264' }),
        uploadedById: adminUser.id,
      },
    }),
    prisma.mediaAsset.upsert({
      where: { name: 'Logo Asset' },
      update: {},
      create: {
        name: 'Logo Asset',
        fileName: 'logo.png',
        type: MediaType.IMAGE,
        url: 'https://example.com/logo.png',
        thumbnail: 'https://example.com/logo-thumb.png',
        fileSize: BigInt(150000),
        resolution: '512x512',
        metadata: JSON.stringify({ format: 'png', hasTransparency: true }),
        uploadedById: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Created/updated sample media assets');

  // Create sample videos for admin user
  const videos = await Promise.all([
    prisma.video.upsert({
      where: { title: 'Sample Video 1' },
      update: {},
      create: {
        title: 'Sample Video 1',
        description: 'A demo video for testing.',
        status: 'COMPLETED',
        userId: adminUser.id,
        fileSize: BigInt(10485760),
        duration: 120,
        thumbnail: 'https://placehold.co/320x180',
        url: 'https://www.example.com/video1.mp4',
        fileUrl: 'https://www.example.com/video1.mp4',
        transcript: 'This is a sample transcript.',
        summary: 'A short summary of the video.',
      },
    }),
    prisma.video.upsert({
      where: { title: 'Sample Video 2' },
      update: {},
      create: {
        title: 'Sample Video 2',
        description: 'Another demo video.',
        status: 'COMPLETED',
        userId: adminUser.id,
        fileSize: BigInt(20485760),
        duration: 240,
        thumbnail: 'https://placehold.co/320x180',
        url: 'https://www.example.com/video2.mp4',
        fileUrl: 'https://www.example.com/video2.mp4',
        transcript: 'Transcript for video 2.',
        summary: 'Summary for video 2.',
      },
    }),
  ]);
  console.log('✅ Created/updated sample videos');

  // Create sample analytics (UserAnalytics, UsageRecord, VideoAnalytics)
  await prisma.userAnalytics.upsert({
    where: { userId: adminUser.id },
    update: {
      totalVideos: 2,
      totalViews: 100,
      totalShares: 10,
      totalDownloads: 5,
      totalWatchTime: 3600,
      aiGenerations: 3,
      exports: 2,
      collaborationTime: 60,
    },
    create: {
      userId: adminUser.id,
      totalVideos: 2,
      totalViews: 100,
      totalShares: 10,
      totalDownloads: 5,
      totalWatchTime: 3600,
      aiGenerations: 3,
      exports: 2,
      collaborationTime: 60,
    },
  });
  await prisma.usageRecord.upsert({
    where: { userId: adminUser.id },
    update: {
      videosCreated: 2,
      aiGenerations: 3,
      exports: 2,
      tokensUsed: 10000,
      costUsd: 2.5,
    },
    create: {
      userId: adminUser.id,
      videosCreated: 2,
      aiGenerations: 3,
      exports: 2,
      tokensUsed: 10000,
      costUsd: 2.5,
    },
  });
  await prisma.videoAnalytics.upsert({
    where: { videoId: videos[0].id },
    update: {
      views: 50,
      shares: 5,
      downloads: 2,
      watchTime: 1800,
    },
    create: {
      videoId: videos[0].id,
      views: 50,
      shares: 5,
      downloads: 2,
      watchTime: 1800,
    },
  });
  console.log('✅ Created/updated sample analytics');

  console.log('🎉 Database seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
