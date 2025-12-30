import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes
const protectedRoutes = ['/dashboard', '/tasks', '/projects', '/team', '/reports', '/projections', '/settings']
const authRoutes = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Get token from cookies or headers
  const token = request.cookies.get('authToken')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '')
  
  // If accessing a protected route without token, redirect to login
  if (isProtectedRoute && !token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }
  
  // If accessing auth route with token, redirect to dashboard
  if (isAuthRoute && token) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  
  // For root path, redirect based on authentication status
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    if (token) {
      url.pathname = '/dashboard'
    } else {
      url.pathname = '/login'
    }
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}