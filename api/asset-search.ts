// Enterprise-grade AI-Powered Asset Search API
import { NextApiRequest, NextApiResponse } from 'next';
import { semanticSearch } from '../features/asset-search-ai';
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
      const { query } = req.body;
      const results = await semanticSearch(query);
      res.status(200).json({ results });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}
