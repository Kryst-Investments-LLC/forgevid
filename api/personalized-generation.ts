// Enterprise-grade Personalized Video Generation API
import { NextApiRequest, NextApiResponse } from 'next';
import { generatePersonalizedVideo, ViewerProfile } from '../features/personalization-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';

async function requireAuth(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  requireAuth(req, res, () => {
    if (req.method === 'POST') {
      const { videoId, profile } = req.body as { videoId: string; profile: ViewerProfile };
      const videoUrl = generatePersonalizedVideo(videoId, profile);
      res.status(200).json({ videoUrl });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}
