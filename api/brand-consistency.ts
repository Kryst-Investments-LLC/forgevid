// Enterprise-grade Brand Consistency Engine API
import { NextApiRequest, NextApiResponse } from 'next';
import { validateBrand, autoCorrectBrand, BrandGuidelines } from '../features/brand-ai';
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
      const { content, guidelines } = req.body as { content: any; guidelines: BrandGuidelines };
      const isValid = validateBrand(content, guidelines);
      const corrected = autoCorrectBrand(content, guidelines);
      res.status(200).json({ isValid, corrected });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}
