'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCurrentFiscalYear } from '@/lib/utils/fiscalYear'

interface Account {
  id: string
  name: string
  slug: string
  sfdc_account_id?: string | null
  logo_url?: string | null
  contract_type?: string | null
  created_at: string
}

interface QuotaAttainmentData {
  fiscal_year: number
  total_attainment: number
  quota: number | null
  attainment_percentage: number | null
}

interface AccountCardProps {
  account: Account
}

export default function AccountCard({ account }: AccountCardProps) {
  const [quotaAttainment, setQuotaAttainment] = useState<QuotaAttainmentData | null>(null)
  const [isLoadingQuota, setIsLoadingQuota] = useState(true)
  const currentFiscalYear = getCurrentFiscalYear()

  useEffect(() => {
    fetchQuotaAttainment()
  }, [account.slug])

  const fetchQuotaAttainment = async () => {
    try {
      const response = await fetch(
        `/api/accounts/${account.slug}/quota-attainment?fiscal_year=${currentFiscalYear}`
      )
      if (response.ok) {
        const data = await response.json()
        setQuotaAttainment(data)
      }
    } catch (error) {
      console.error('Error fetching quota attainment:', error)
    } finally {
      setIsLoadingQuota(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getStatusColor = (percentage: number | null) => {
    if (percentage === null) return 'bg-slate-700'
    if (percentage >= 100) return 'bg-green-600'
    if (percentage >= 75) return 'bg-hello-yellow'
    if (percentage >= 50) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  const getStatusText = (percentage: number | null) => {
    if (percentage === null) return 'No quota'
    if (percentage >= 100) return 'Complete'
    if (percentage >= 75) return 'On Track'
    if (percentage >= 50) return 'Behind'
    return 'At Risk'
  }

  return (
    <Link
      href={`/accounts/${account.slug}`}
      className="block p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-hello-yellow transition-colors"
    >
      <div className="flex items-start gap-4 mb-3">
        {account.logo_url && (
          <img
            src={account.logo_url}
            alt={`${account.name} logo`}
            className="w-12 h-12 object-contain bg-slate-800 p-2 rounded border border-slate-700 flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-white mb-2 truncate">{account.name}</h2>
          {account.contract_type && (
            <span className="inline-block px-2 py-1 bg-hello-yellow/20 text-hello-yellow text-xs font-medium rounded mb-2">
              {account.contract_type}
            </span>
          )}
        </div>
      </div>
      
      <div className="space-y-1 text-sm text-slate-400">
        {account.sfdc_account_id && (
          <p>
            <span className="text-slate-500">SFDC ID:</span>{' '}
            {account.sfdc_account_id}
          </p>
        )}
      </div>

      {/* Quota Attainment Section */}
      {quotaAttainment && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">FY {quotaAttainment.fiscal_year}</span>
            {quotaAttainment.attainment_percentage !== null && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  quotaAttainment.attainment_percentage >= 100
                    ? 'bg-green-900/30 text-green-400'
                    : quotaAttainment.attainment_percentage >= 75
                    ? 'bg-hello-yellow/20 text-hello-yellow'
                    : quotaAttainment.attainment_percentage >= 50
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {getStatusText(quotaAttainment.attainment_percentage)}
              </span>
            )}
          </div>
          
          {quotaAttainment.quota !== null && quotaAttainment.quota > 0 && (
            <>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getStatusColor(
                    quotaAttainment.attainment_percentage
                  )}`}
                  style={{
                    width: `${
                      quotaAttainment.attainment_percentage !== null
                        ? Math.min(quotaAttainment.attainment_percentage, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  {formatCurrency(quotaAttainment.total_attainment)}
                </span>
                <span className="text-slate-500">
                  / {formatCurrency(quotaAttainment.quota)}
                  {quotaAttainment.attainment_percentage !== null && (
                    <span className="ml-1">
                      ({quotaAttainment.attainment_percentage.toFixed(0)}%)
                    </span>
                  )}
                </span>
              </div>
            </>
          )}
          {quotaAttainment.quota === null && (
            <div className="text-xs text-slate-500">
              Attainment: {formatCurrency(quotaAttainment.total_attainment)} (No quota set)
            </div>
          )}
        </div>
      )}

      {isLoadingQuota && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">Loading quota attainment...</div>
        </div>
      )}

      <p className="text-slate-500 text-xs mt-3">
        Created: {new Date(account.created_at).toLocaleDateString()}
      </p>
    </Link>
  )
}
