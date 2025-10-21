import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const token = Math.random().toString(36).substring(2, 15);
  const res = NextResponse.next();
  res.headers.set('X-CSRF-Token', token);
  return res;
}

export async function verifyCSRFTokenMiddleware(req: Request) {
  const token = req.headers.get('X-CSRF-Token');
  if (!token) {
    return NextResponse.json({ error: 'CSRF token missing' }, { status: 403 });
  }
  
  // Simple token validation - replace with proper implementation
  if (token.length < 10) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  
  return NextResponse.next();
}

// In forms: <input type="hidden" value={csrfToken} />