import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Define your protected and public routes
// const protectedRoutes = ['/home/dashboard', '/home/practice-history'];
const protectedRoutes: string[] = [];
const publicRoutes = ['/accounts/login', '/accounts/signup', '/'];

export function middleware(request: NextRequest) {
  // 2. Get the token from the user's cookies
  const token = request.cookies.get('accessToken')?.value;

  // 3. Check if the user is trying to access a protected route
  const isProtectedRoute = protectedRoutes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (isProtectedRoute) {
    // 4. If no token, redirect to the login page
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/accounts/login';
      // You can add a 'from' query param to redirect them back after login
      url.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  // 5. If they are logged in and try to go to login/signup, redirect to dashboard
  if (
    token &&
    publicRoutes.includes(request.nextUrl.pathname) &&
    request.nextUrl.pathname !== '/' // allow going to home
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/home/dashboard';
    return NextResponse.redirect(url);
  }

  // 6. If all checks pass, let them proceed
  return NextResponse.next();
}

// 7. Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
