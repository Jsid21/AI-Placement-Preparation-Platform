import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Only apply to WebSocket routes
  if (request.nextUrl.pathname.startsWith('/api/ws-personality')) {
    // Just pass through WebSocket requests - they'll be handled by the route handler
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/ws-personality/:path*'],
};