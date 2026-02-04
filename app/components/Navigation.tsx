'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navigation() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

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
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {user && (
              <Link
                href="/"
                className="flex items-center px-2 py-2 text-white hover:text-hello-yellow transition-colors"
              >
                Account Management
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/accounts"
                  className="px-3 py-2 text-white hover:text-hello-yellow transition-colors"
                >
                  Accounts
                </Link>
                <Link
                  href="/quota-attainment/upload"
                  className="px-3 py-2 text-white hover:text-hello-yellow transition-colors"
                >
                  Quota Attainment
                </Link>
                <Link
                  href="/admin/products"
                  className="px-3 py-2 text-white hover:text-hello-yellow transition-colors"
                >
                  Products
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 text-white hover:text-hello-yellow transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
