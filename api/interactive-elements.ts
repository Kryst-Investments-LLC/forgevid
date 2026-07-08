// Enterprise-grade Interactive Video Elements API
import { NextApiRequest, NextApiResponse } from 'next';
import { addInteractiveElement, InteractiveElement } from '../features/interactive-ai';
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
      const { videoId, element } = req.body as { videoId: string; element: InteractiveElement };
      const success = addInteractiveElement(videoId, element);
      res.status(200).json({ success });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}
