import { NextResponse } from 'next/server'
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac'
import { getHackathonEvidence } from '@/lib/hackathon-evidence'

function csv(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  const user = await getFreshSessionUser()
  if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const evidence = await getHackathonEvidence()
  const headers = ['userId', 'email', 'name', 'registeredAt', 'activated', 'repeatUser', 'videos', 'completed', 'exports', 'revenueUsd', 'aiCostUsd', 'testimonial', 'publicTestimonial']
  const lines = [
    headers.map(csv).join(','),
    ...evidence.rows.map((row) => headers.map((key) => csv((row as any)[key.replace('Usd', '')] ?? (row as any)[key])).join(',')),
  ]
  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="forgevid-hackathon-evidence-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
