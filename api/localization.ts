// Enterprise-grade Automated Localization API
import { NextApiRequest, NextApiResponse } from 'next';
import { translateText, generateVoiceover, generateSubtitles } from '../features/localization-ai';
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
      const { text, targetLang } = req.body;
      const translated = await translateText(text, targetLang);
      const voiceoverUrl = await generateVoiceover(translated, targetLang);
      const subtitlesUrl = await generateSubtitles(translated, targetLang);
      res.status(200).json({ translated, voiceoverUrl, subtitlesUrl });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}
