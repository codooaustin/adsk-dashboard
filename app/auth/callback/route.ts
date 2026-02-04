import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/accounts'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const redirectUrl = new URL('/login', requestUrl.origin)
      redirectUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(redirectUrl)
    }
  }

  const redirectUrl = new URL(next.startsWith('/') ? next : '/accounts', requestUrl.origin)
  return NextResponse.redirect(redirectUrl)
}
