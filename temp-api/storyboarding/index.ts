// AI-Driven Storyboarding API Endpoint
// Production-grade: TypeScript, error handling, JWT auth, integration-ready
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyJWT } from '../../../lib/auth';
import { generateStoryboard } from '../../../lib/storyboarding';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !verifyJWT(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { script, preferences } = req.body;
    if (!script) {
      return res.status(400).json({ error: 'Missing script' });
    }

    // Generate storyboard using AI
    const storyboard = await generateStoryboard(script, preferences);
    return res.status(200).json({ storyboard });
  } catch (error) {
    console.error('Storyboard API error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
