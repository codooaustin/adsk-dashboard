'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const ACCOUNT_SUB_PATHS = [
  { label: 'Overview', segment: '' },
  { label: 'Dashboard', segment: 'dashboard' },
  { label: 'KPIs', segment: 'kpis' },
  { label: 'Datasets', segment: 'datasets' },
  { label: 'Quota', segment: 'quota' },
  { label: 'Settings', segment: 'settings' },
] as const

function getAccountPathSegments(pathname: string): { slug: string; segment: string } | null {
  const match = pathname.match(/^\/accounts\/([^/]+)(?:\/(.*))?/)
  if (!match) return null
  const slug = match[1]
  const segment = (match[2] || '').split('/')[0] || ''
  return { slug, segment }
}

function hrefFor(slug: string, segment: string): string {
  const base = `/accounts/${slug}`
  return segment ? `${base}/${segment}` : base
}

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    setMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const current = getAccountPathSegments(pathname)

  if (!user) {
    return (
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-white hover:text-hello-yellow transition-colors">
              Account Management
            </Link>
            <Link href="/login" className="px-3 py-2 text-white hover:text-hello-yellow transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b border-slate-800 shrink-0 w-full lg:w-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link
            href="/accounts"
            className="flex items-center px-2 py-2 text-white hover:text-hello-yellow transition-colors font-medium"
          >
            Account Management
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Log out
              </button>
            </div>

            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/50"
                    aria-hidden
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 py-2 rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                    <Link
                      href="/accounts"
                      className="block px-4 py-2 text-sm text-white hover:bg-slate-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      All accounts
                    </Link>
                    {current && (
                      <>
                        <div className="border-t border-slate-700 my-2" />
                        {ACCOUNT_SUB_PATHS.map(({ label, segment }) => (
                          <Link
                            key={segment || 'overview'}
                            href={hrefFor(current.slug, segment)}
                            className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                            onClick={() => setMenuOpen(false)}
                          >
                            {label}
                          </Link>
                        ))}
                        <div className="border-t border-slate-700 my-2" />
                      </>
                    )}
                    <Link
                      href="/quota-attainment/upload"
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                      onClick={() => setMenuOpen(false)}
                    >
                      Quota Attainment
                    </Link>
                    <Link
                      href="/admin/products"
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                      onClick={() => setMenuOpen(false)}
                    >
                      Products
                    </Link>
                    <div className="border-t border-slate-700 my-2" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
