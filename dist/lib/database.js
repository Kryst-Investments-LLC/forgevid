import { PrismaClient } from '@prisma/client';
// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
// Database utility functions
export async function checkDatabaseConnection() {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}
export function createPaginationResult(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev
        }
    };
}
export class DatabaseError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'DatabaseError';
    }
}
