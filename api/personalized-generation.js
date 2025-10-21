import { generatePersonalizedVideo } from '../features/personalization-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';
async function requireAuth(req, res, next) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}
export default function handler(req, res) {
    requireAuth(req, res, () => {
        if (req.method === 'POST') {
            const { videoId, profile } = req.body;
            const videoUrl = generatePersonalizedVideo(videoId, profile);
            res.status(200).json({ videoUrl });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    });
}
