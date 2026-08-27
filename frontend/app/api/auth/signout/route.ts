import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Supabase removed: sign out clears local auth cookie and redirects to login

export async function POST() {
  const cookieStore = cookies();
  // Clear auth cookie used by the app (if any)
  // Note: frontend currently stores token in localStorage under 'wtf_token'.
  // If a cookie exists, remove it by setting Max-Age=0.
  const redirectUrl = new URL('/admin/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  const res = NextResponse.redirect(redirectUrl);
  try {
    // remove cookie named 'wtf_token' if present
    res.headers.set('Set-Cookie', 'wtf_token=; Path=/; Max-Age=0; HttpOnly');
  } catch (e) {
    // ignore header errors
  }
  return res;
}
