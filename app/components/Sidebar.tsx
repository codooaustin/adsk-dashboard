'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AccountSummary {
  id: string
  name: string
  slug: string
}

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

export default function Sidebar() {
  const pathname = usePathname()
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const current = getAccountPathSegments(pathname)

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => res.ok && res.json())
      .then((data) => (Array.isArray(data) ? setAccounts(data) : []))
      .catch(() => setAccounts([]))
  }, [])

  const currentSegment = current?.segment ?? ''

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 shrink-0 border-r border-slate-800 bg-black"
      aria-label="Sidebar"
    >
      <div className="flex flex-col gap-6 py-4 px-3 overflow-y-auto">
        <div>
          <Link
            href="/accounts"
            className="block px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-slate-800 hover:text-hello-yellow transition-colors"
          >
            All accounts
          </Link>
        </div>

        {current && (
          <>
            <div>
              <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Account
              </p>
              <div className="space-y-0.5">
                {accounts
                  .filter((a) => a.slug !== current.slug)
                  .map((account) => {
                    const linkHref = hrefFor(account.slug, currentSegment)
                    return (
                      <Link
                        key={account.id}
                        href={linkHref}
                        className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors truncate"
                        title={account.name}
                      >
                        {account.name}
                      </Link>
                    )
                  })}
                {accounts.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-500">Loading accounts…</p>
                )}
              </div>
            </div>

            <div>
              <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                {accounts.find((a) => a.slug === current.slug)?.name ?? current.slug}
              </p>
              <nav className="space-y-0.5" aria-label="Account sections">
                {ACCOUNT_SUB_PATHS.map(({ label, segment }) => {
                  const href = hrefFor(current.slug, segment)
                  const isActive =
                    segment === ''
                      ? pathname === `/accounts/${current.slug}` || pathname === `/accounts/${current.slug}/`
                      : pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={segment || 'overview'}
                      href={href}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-800 text-hello-yellow font-medium'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </>
        )}

        <div>
          <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Global
          </p>
          <div className="space-y-0.5">
            <Link
              href="/quota-attainment/upload"
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                pathname.startsWith('/quota-attainment')
                  ? 'bg-slate-800 text-hello-yellow font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Quota Attainment
            </Link>
            <Link
              href="/admin/products"
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                pathname.startsWith('/admin/products')
                  ? 'bg-slate-800 text-hello-yellow font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Products
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
