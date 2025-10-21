import { registerPlugin, listPlugins } from '../features/plugin-manager';
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
            const plugin = req.body.plugin;
            const success = registerPlugin(plugin);
            res.status(200).json({ success });
        }
        else if (req.method === 'GET') {
            const plugins = listPlugins();
            res.status(200).json({ plugins });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    });
}
