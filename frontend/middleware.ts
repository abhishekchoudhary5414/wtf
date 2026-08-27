import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle Admin routes
  if (pathname.startsWith('/admin')) {
    const authToken = request.cookies.get('wtf_token')?.value || request.cookies.get('sb-idhblxenajvbodicaaej-auth-token')?.value;
    const verifier = request.cookies.get('sb-idhblxenajvbodicaaej-auth-token-code-verifier')?.value;

    const tokenFromQuery = request.nextUrl.searchParams.get('token');
    if (tokenFromQuery) {
      const res = NextResponse.next();
      res.cookies.set('wtf_token', tokenFromQuery, { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 3600 });
      return res;
    }

    if (pathname === '/admin/login') {
      if (authToken || verifier) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (!authToken && !verifier) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Handle School routes
  if (pathname.startsWith('/schools')) {
    const schoolToken = request.cookies.get('school_token')?.value;

    if (pathname === '/schools/login') {
      if (schoolToken) {
        return NextResponse.redirect(new URL('/schools/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (!schoolToken) {
      return NextResponse.redirect(new URL('/schools/login', request.url));
    }
  }

  // Handle Life Coach routes
  if (pathname.startsWith('/lifecoach') || pathname.startsWith('/life-coaches')) {
    const coachToken = request.cookies.get('lifecoach_token')?.value;

    if (pathname === '/lifecoach/login' || pathname === '/life-coaches/login') {
      if (coachToken) {
        return NextResponse.redirect(new URL('/lifecoach/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (!coachToken) {
      return NextResponse.redirect(new URL('/lifecoach/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/schools/:path*', '/lifecoach/:path*', '/life-coaches/:path*'],
};
