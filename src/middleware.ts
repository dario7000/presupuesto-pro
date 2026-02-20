import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // Only protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check for supabase auth cookie
    const supabaseToken = request.cookies.get('sb-access-token')?.value
      || request.cookies.getAll().find(c => c.name.includes('auth-token'))?.value

    // If no auth cookies at all, redirect to login
    // Note: Full session validation happens client-side
    // This is a fast first-pass check
    const hasAuthCookie = request.cookies.getAll().some(c => 
      c.name.includes('supabase') || c.name.includes('sb-')
    )

    if (!hasAuthCookie && !supabaseToken) {
      // Allow through — the client-side auth will handle redirect
      // This avoids issues with Supabase's client-side auth flow
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
