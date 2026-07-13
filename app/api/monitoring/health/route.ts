import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Liveness/readiness probe. The Docker HEALTHCHECK and any uptime monitor hit
 * this. Public and cheap: confirms the process is up and the database answers.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const ok = database;
  return NextResponse.json(
    { status: ok ? 'ok' : 'degraded', checks: { database }, timestamp: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
