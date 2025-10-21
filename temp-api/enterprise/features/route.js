import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GDPRCompliance } from '@/lib/compliance/gdpr';
import { SOC2Compliance } from '@/lib/compliance/soc2';
import { cache } from '@/lib/performance/cache';
import { cdnOptimizer } from '@/lib/performance/cdn';
import { dbOptimizer } from '@/lib/performance/database';
import { Logger } from '@/lib/logger';
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const feature = searchParams.get('feature');
        switch (feature) {
            case 'gdpr':
                return await handleGDPRRequest(request, session.user.id);
            case 'soc2':
                return await handleSOC2Request(request, session.user.id);
            case 'performance':
                return await handlePerformanceRequest(request, session.user.id);
            case 'health':
                return await handleHealthRequest(request, session.user.id);
            default:
                return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
        }
    }
    catch (error) {
        Logger.error('Enterprise features API error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const feature = searchParams.get('feature');
        const body = await request.json();
        switch (feature) {
            case 'gdpr':
                return await handleGDPRAction(request, session.user.id, body);
            case 'soc2':
                return await handleSOC2Action(request, session.user.id, body);
            case 'performance':
                return await handlePerformanceAction(request, session.user.id, body);
            default:
                return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
        }
    }
    catch (error) {
        Logger.error('Enterprise features API error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
// GDPR handlers
async function handleGDPRRequest(request, userId) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    switch (action) {
        case 'status':
            const status = await GDPRCompliance.getComplianceStatus(userId);
            return NextResponse.json({ status });
        case 'access':
            const accessData = await GDPRCompliance.handleDataAccessRequest(userId);
            return NextResponse.json({ data: accessData });
        case 'portability':
            const portableData = await GDPRCompliance.handleDataPortabilityRequest(userId);
            return NextResponse.json({ data: portableData });
        default:
            return NextResponse.json({ error: 'Invalid GDPR action' }, { status: 400 });
    }
}
async function handleGDPRAction(request, userId, body) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    switch (action) {
        case 'rectification':
            await GDPRCompliance.handleDataRectificationRequest(userId, body.corrections);
            return NextResponse.json({ success: true });
        case 'erasure':
            await GDPRCompliance.handleDataErasureRequest(userId);
            return NextResponse.json({ success: true });
        case 'restriction':
            await GDPRCompliance.handleDataRestrictionRequest(userId, body.restrictionType);
            return NextResponse.json({ success: true });
        case 'consent':
            await GDPRCompliance.recordConsent(userId, body.consentData);
            return NextResponse.json({ success: true });
        default:
            return NextResponse.json({ error: 'Invalid GDPR action' }, { status: 400 });
    }
}
// SOC2 handlers
async function handleSOC2Request(request, userId) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    switch (action) {
        case 'dashboard':
            const dashboard = await SOC2Compliance.getComplianceDashboard();
            return NextResponse.json({ dashboard });
        case 'assessment':
            const controls = await SOC2Compliance.runSOC2Assessment();
            return NextResponse.json({ controls });
        default:
            return NextResponse.json({ error: 'Invalid SOC2 action' }, { status: 400 });
    }
}
async function handleSOC2Action(request, userId, body) {
    // SOC2 actions would typically be admin-only
    // For now, we'll just return a success response
    return NextResponse.json({ success: true });
}
// Performance handlers
async function handlePerformanceRequest(request, userId) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    switch (action) {
        case 'cache-stats':
            const cacheStats = cache.getStats();
            return NextResponse.json({ stats: cacheStats });
        case 'cdn-stats':
            const cdnStats = cdnOptimizer.getStats();
            return NextResponse.json({ stats: cdnStats });
        case 'db-stats':
            const dbStats = dbOptimizer.getStats();
            return NextResponse.json({ stats: dbStats });
        case 'optimize':
            await dbOptimizer.optimizeConnections();
            await cache.warmUp();
            return NextResponse.json({ success: true });
        default:
            return NextResponse.json({ error: 'Invalid performance action' }, { status: 400 });
    }
}
async function handlePerformanceAction(request, userId, body) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    switch (action) {
        case 'preload-images':
            await cdnOptimizer.preloadImages(body.publicIds, body.optimization);
            return NextResponse.json({ success: true });
        case 'clear-cache':
            await cache.invalidatePattern(body.pattern, body.namespace);
            return NextResponse.json({ success: true });
        default:
            return NextResponse.json({ error: 'Invalid performance action' }, { status: 400 });
    }
}
// Health handlers
async function handleHealthRequest(request, userId) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    switch (action) {
        case 'cache':
            const cacheHealth = await cache.healthCheck();
            return NextResponse.json({ health: cacheHealth });
        case 'cdn':
            const cdnHealth = await cdnOptimizer.healthCheck();
            return NextResponse.json({ health: cdnHealth });
        case 'database':
            const dbHealth = await dbOptimizer.healthCheck();
            return NextResponse.json({ health: dbHealth });
        case 'all':
            const [cacheHealthAll, cdnHealthAll, dbHealthAll] = await Promise.all([
                cache.healthCheck(),
                cdnOptimizer.healthCheck(),
                dbOptimizer.healthCheck()
            ]);
            const overallHealth = {
                status: cacheHealthAll.status === 'healthy' &&
                    cdnHealthAll.status === 'healthy' &&
                    dbHealthAll.status === 'healthy' ? 'healthy' : 'unhealthy',
                services: {
                    cache: cacheHealthAll,
                    cdn: cdnHealthAll,
                    database: dbHealthAll
                },
                timestamp: new Date().toISOString()
            };
            return NextResponse.json({ health: overallHealth });
        default:
            return NextResponse.json({ error: 'Invalid health action' }, { status: 400 });
    }
}
