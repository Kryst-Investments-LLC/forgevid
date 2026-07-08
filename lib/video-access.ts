import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';

export type VideoAccess =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

/**
 * Authenticate the caller and confirm they own the video.
 * Returns 404 (not 403) for someone else's video so we don't leak existence.
 */
export async function requireVideoOwner(videoId: string): Promise<VideoAccess> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { userId: true },
  });

  if (!video || video.userId !== session.user.id) {
    return { ok: false, status: 404, error: 'Not found' };
  }

  return { ok: true, userId: session.user.id };
}
