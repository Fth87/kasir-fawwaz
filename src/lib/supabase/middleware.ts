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

  // --- LOGIKA PROTEKSI RUTE (TETAP SAMA, SUDAH BENAR) ---

  const publicPaths = ['/login', '/auth/callback']

  // Jika user belum login dan mencoba mengakses halaman yang dilindungi
  if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Jika user sudah login dan mencoba mengakses halaman login/auth
  if (user && publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}
