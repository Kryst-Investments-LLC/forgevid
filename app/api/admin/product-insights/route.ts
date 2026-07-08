import { NextRequest, NextResponse } from 'next/server';
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac';
import { getProductInsights } from '@/lib/product-loop';

/**
 * GET /api/admin/product-insights?days=30 — the improvement dashboard.
 *
 * Failure rate, re-render rate, hand-edit volume, style demand and unit cost:
 * the numbers that say what to fix next. This is the platform's feedback loop
 * — and the labelled usage dataset a future model for this product trains on.
 */
export async function GET(req: NextRequest) {
  // Same freshness-checked RBAC as the other admin endpoints.
  const user = await getFreshSessionUser();
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));
  return NextResponse.json(await getProductInsights(days));
}
