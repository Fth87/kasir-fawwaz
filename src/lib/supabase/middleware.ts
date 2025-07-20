import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Ambil data user, ini juga akan me-refresh session cookie
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl


  const publicPaths = ['/service-status']; // Boleh diakses siapa saja (login/tidak)
  const authRoutes = ['/login', '/auth/callback']; // Hanya untuk yang BELUM login

  const isPublic = publicPaths.some(p => pathname.startsWith(p));
  const isAuthRoute = authRoutes.some(p => pathname.startsWith(p));

  // 2. Jika user sudah login dan mencoba mengakses halaman login/register, alihkan
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. Jika user belum login DAN mencoba mengakses halaman yang dilindungi
  //    (bukan halaman publik dan bukan halaman auth), alihkan ke login
  if (!user && !isPublic && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }


  return supabaseResponse
}
