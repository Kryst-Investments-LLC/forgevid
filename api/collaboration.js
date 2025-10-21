import { generateAISuggestion } from '../features/collaboration-ai';
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
            // Handle AI suggestion for edit
            const edit = req.body.edit;
            const suggestion = generateAISuggestion(edit);
            res.status(200).json({ suggestion });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    });
}
