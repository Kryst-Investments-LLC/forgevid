// Health Check API Endpoint
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
      checks: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        openai: await checkOpenAI(),
        stripe: await checkStripe(),
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Determine overall status
    const failedChecks = Object.values(healthCheck.checks).filter(check => !check).length;
    const totalChecks = Object.keys(healthCheck.checks).length;
    
    if (failedChecks === 0) {
      healthCheck.status = 'healthy';
    } else if (failedChecks <= totalChecks / 2) {
      healthCheck.status = 'degraded';
    } else {
      healthCheck.status = 'unhealthy';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    // In production, this would check actual database connection
    // For now, return true as a placeholder
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    // In production, this would check actual Redis connection
    // For now, return true as a placeholder
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

async function checkOpenAI(): Promise<boolean> {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_SECRET_KEY) {
      return false;
    }
    
    // In production, this would make a test API call
    // For now, just check if the key exists
    return true;
  } catch (error) {
    console.error('OpenAI health check failed:', error);
    return false;
  }
}

async function checkStripe(): Promise<boolean> {
  try {
    // Check if Stripe keys are configured
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
      return false;
    }
    
    // In production, this would make a test API call
    // For now, just check if the keys exist
    return true;
  } catch (error) {
    console.error('Stripe health check failed:', error);
    return false;
  }
}
