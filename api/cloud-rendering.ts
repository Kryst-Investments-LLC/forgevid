// Enterprise-grade Cloud Rendering & Scalability API
import { NextApiRequest, NextApiResponse } from 'next';
import { renderVideoCloud, queueRenderJob } from '../features/cloud-rendering-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';

async function requireAuth(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  requireAuth(req, res, async () => {
    if (req.method === 'POST') {
      const { videoId } = req.body;
      queueRenderJob(videoId);
      const videoUrl = await renderVideoCloud(videoId);
      res.status(200).json({ videoUrl });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}
