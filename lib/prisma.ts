import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (process.env.DATABASE_URL) {
  prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling for production
    transactionOptions: {
      maxWait: 2000,
      timeout: 5000,
    },
  });
} else {
  // Create a mock Prisma client for build time when DATABASE_URL is not available
  prisma = {
    usageRecord: {
      create: async () => ({ id: 'mock', userId: 'mock', action: 'mock', createdAt: new Date() }),
      findMany: async () => [],
    },
    user: {
      findUnique: async () => null,
      create: async () => ({ id: 'mock', email: 'mock' }),
    },
    $disconnect: async () => {},
  } as any;
}

if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
export { prisma };





