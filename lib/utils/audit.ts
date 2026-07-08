import { prisma } from '@/lib/database';  // Use existing database setup

// SOC2-compliant audit logging
export async function logAudit(event: string, userId?: string, details?: any) {
  await prisma.auditLog.create({
    data: {
      action: event,
      resource: 'system',
      userId,
      details: details || undefined,
    },
  });
  console.log(`Audit: ${event} by user ${userId}`);
}
