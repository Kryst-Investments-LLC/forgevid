import { NextResponse } from 'next/server'
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac'
import { getHackathonEvidence } from '@/lib/hackathon-evidence'

export async function GET() {
  const user = await getFreshSessionUser()
  if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  return NextResponse.json(await getHackathonEvidence())
}
