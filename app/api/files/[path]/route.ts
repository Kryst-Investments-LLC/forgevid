import { NextRequest, NextResponse } from 'next/server'

function hasTraversal(p: string): boolean {
  const decoded = decodeURIComponent(p)
  if (decoded.includes('..') || decoded.includes('..\\') || decoded.includes('..//')) return true
  if (/\.%2e|%2e\.|%2f|%5c|\.\.|\x2e\x2e/i.test(p)) return true
  return false
}

export async function GET(_req: NextRequest, props: { params: Promise<{ path: string }> }) {
  const params = await props.params;
  const relPath = params.path || ''
  if (hasTraversal(relPath)) {
    return NextResponse.json({ error: 'Path traversal blocked' }, { status: 403 })
  }
  // No actual file serving; return 404 for unknown/unsafe requests
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}


