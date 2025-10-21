// Enterprise-grade API & Plugin Ecosystem API
import { NextApiRequest, NextApiResponse } from 'next';
import { registerPlugin, listPlugins, Plugin } from '../features/plugin-manager';
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
      const plugin: Plugin = req.body.plugin;
      const success = registerPlugin(plugin);
      res.status(200).json({ success });
    } else if (req.method === 'GET') {
      const plugins = listPlugins();
      res.status(200).json({ plugins });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}
