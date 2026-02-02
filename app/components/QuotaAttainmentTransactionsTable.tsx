'use client'

import { useState, useEffect, useMemo } from 'react'
import { getCurrentFiscalYear } from '@/lib/utils/fiscalYear'

interface Transaction {
  id: string
  transaction_date: string | null
  commission_month: string | null
  fiscal_year: number | null
  final_credited_amount: number | null
  end_user_name: string | null
  product_class: string | null
  offer_detail: string | null
  invoice_amt_dc: number | null
  sales_rep_name: string | null
}

interface QuotaAttainmentTransactionsTableProps {
  accountSlug: string
  defaultFiscalYear?: number
}

export default function QuotaAttainmentTransactionsTable({
  accountSlug,
  defaultFiscalYear,
}: QuotaAttainmentTransactionsTableProps) {
  const currentFy = getCurrentFiscalYear()
  const [fiscalYear, setFiscalYear] = useState<number | 'all'>(defaultFiscalYear ?? currentFy)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(50)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fiscalYearOptions = useMemo(() => {
    const opts: { value: 'all' | number; label: string }[] = [
      { value: 'all', label: 'All years' },
    ]
    for (let fy = currentFy; fy >= currentFy - 4; fy--) {
      opts.push({ value: fy, label: `FY ${fy}` })
    }
    return opts
  }, [currentFy])

  useEffect(() => {
    fetchTransactions()
  }, [accountSlug, fiscalYear, page])

  const fetchTransactions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (fiscalYear !== 'all') params.set('fiscal_year', String(fiscalYear))
      params.set('page', String(page))
      params.set('limit', String(limit))
      const res = await fetch(
        `/api/accounts/${accountSlug}/quota-attainment/transactions?${params}`
      )
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (e) {
      console.error(e)
      setError('Failed to load transactions')
      setData([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (v: number | null) => {
    if (v == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const str = (v: string | null | undefined) =>
    v != null && String(v).trim() !== '' ? String(v).trim() : '—'

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasNext = page < totalPages
  const hasPrev = page > 1

  const showEndUser = data.some((r) => str(r.end_user_name) !== '—')
  const showProductClass = data.some((r) => str(r.product_class) !== '—')
  const showOfferDetail = data.some((r) => str(r.offer_detail) !== '—')

  if (error) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Fiscal year</label>
          <select
            value={fiscalYear === 'all' ? 'all' : fiscalYear}
            onChange={(e) => {
              const v = e.target.value
              setFiscalYear(v === 'all' ? 'all' : parseInt(v, 10))
              setPage(1)
            }}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-hello-yellow focus:outline-none focus:ring-1 focus:ring-hello-yellow"
          >
            {fiscalYearOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading transactions…</p>
      ) : data.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No transactions found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Commission Month</th>
                  <th className="pb-3 pr-4 font-medium">Final Credited Amount</th>
                  <th className="pb-3 pr-4 font-medium">Invoice Amount</th>
                  {showEndUser && <th className="pb-3 pr-4 font-medium">End User</th>}
                  {showProductClass && <th className="pb-3 pr-4 font-medium">Product Class</th>}
                  {showOfferDetail && <th className="pb-3 pr-4 font-medium">Offer Detail</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-700/80 last:border-0"
                  >
                    <td className="py-3 pr-4 text-white">{formatDate(row.transaction_date)}</td>
                    <td className="py-3 pr-4 text-slate-300">{str(row.commission_month)}</td>
                    <td className="py-3 pr-4 text-white">
                      {formatCurrency(row.final_credited_amount)}
                    </td>
                    <td className="py-3 pr-4 text-white">
                      {formatCurrency(row.invoice_amt_dc)}
                    </td>
                    {showEndUser && (
                      <td className="py-3 pr-4 text-slate-300">{str(row.end_user_name)}</td>
                    )}
                    {showProductClass && (
                      <td className="py-3 pr-4 text-slate-300">{str(row.product_class)}</td>
                    )}
                    {showOfferDetail && (
                      <td className="py-3 pr-4 text-slate-300">{str(row.offer_detail)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:enabled:border-slate-500"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:enabled:border-slate-500"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
