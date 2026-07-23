import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import VideoComments from '@/components/video-comments';

/**
 * Public share page — the free-tier watermark's growth channel.
 *
 * Opt-in only: a video renders here solely when its owner enabled sharing
 * (metadata.shareEnabled), never by id-guessing. Server component so the OG
 * tags are real for link unfurls.
 */

export const dynamic = 'force-dynamic';

async function loadSharedVideo(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      url: true,
      fileUrl: true,
      thumbnail: true,
      metadata: true,
    },
  });
  if (!video || video.status !== 'COMPLETED') return null;

  let shareEnabled = false;
  try {
    shareEnabled = JSON.parse(video.metadata ?? '{}')?.shareEnabled === true;
  } catch {
    shareEnabled = false;
  }
  if (!shareEnabled) return null;

  const src = video.fileUrl || video.url;
  if (!src) return null;
  return { ...video, src };
}

export async function generateMetadata({
  params,
}: {
  params: { videoId: string };
}): Promise<Metadata> {
  const video = await loadSharedVideo(params.videoId);
  if (!video) return { title: 'Video not found — ForgeVid' };
  return {
    title: `${video.title} — ForgeVid`,
    description: video.description?.slice(0, 160) || 'Made with ForgeVid',
    openGraph: {
      title: video.title,
      description: video.description?.slice(0, 160) || 'Made with ForgeVid',
      type: 'video.other',
      ...(video.thumbnail ? { images: [{ url: video.thumbnail }] } : {}),
      videos: [{ url: video.src }],
    },
  };
}

export default async function SharedVideoPage({ params }: { params: { videoId: string } }) {
  const video = await loadSharedVideo(params.videoId);
  if (!video) notFound();

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 gap-6">
      <h1 className="text-xl font-semibold text-center max-w-2xl">{video.title}</h1>
      <video
        controls
        playsInline
        poster={video.thumbnail ?? undefined}
        className="w-full max-w-3xl rounded-lg border border-white/10"
      >
        <source src={video.src} type="video/mp4" />
        Your browser cannot play this video.
      </video>

      <VideoComments videoId={params.videoId} />

      <a
        href="/"
        className="text-sm text-white/60 hover:text-white underline underline-offset-4"
      >
        Made with ForgeVid — create yours
      </a>
    </main>
  );
}
