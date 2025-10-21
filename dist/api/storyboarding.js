import { generateStoryboard } from '../features/storyboard-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';
// Security: Auth middleware
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
            // Handle storyboard generation
            const script = req.body.script;
            const storyboard = generateStoryboard(script);
            res.status(200).json({ storyboard });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    });
}
