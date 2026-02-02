'use client'

import { useState, useEffect } from 'react'

interface OverallQuotaAttainmentData {
  fiscal_year: number
  total_attainment: number
  total_quota: number
  attainment_percentage: number | null
  account_count: number
}

export default function OverallQuotaAttainmentSummary() {
  const [data, setData] = useState<OverallQuotaAttainmentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOverallQuotaAttainment()
  }, [])

  const fetchOverallQuotaAttainment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/quota-attainment/overall')
      if (!response.ok) {
        throw new Error('Failed to fetch overall quota attainment')
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching overall quota attainment:', error)
      setError('Failed to load overall quota attainment data')
    } finally {
      setIsLoading(false)
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
    if (percentage === null) return 'No quota set'
    if (percentage >= 100) return 'Complete'
    if (percentage >= 75) return 'On Track'
    if (percentage >= 50) return 'Behind'
    return 'At Risk'
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
        <div className="text-slate-400 text-sm">Loading overall quota attainment...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
        <div className="text-center py-8 text-slate-400 text-sm">
          No overall quota attainment data available
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Overall Fiscal Year {data.fiscal_year} Quota Attainment
          </h3>
          {data.total_quota === 0 && (
            <p className="text-sm text-slate-400 mt-1">
              No quotas set for this fiscal year
            </p>
          )}
          {data.account_count > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Across {data.account_count} account{data.account_count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {data.attainment_percentage !== null && (
          <div
            className={`px-3 py-1 rounded text-sm font-medium ${
              data.attainment_percentage >= 100
                ? 'bg-green-900/30 text-green-400'
                : data.attainment_percentage >= 75
                ? 'bg-hello-yellow/20 text-hello-yellow'
                : data.attainment_percentage >= 50
                ? 'bg-yellow-900/30 text-yellow-400'
                : 'bg-red-900/30 text-red-400'
            }`}
          >
            {getStatusText(data.attainment_percentage)}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        {data.total_quota > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Progress</span>
              <span className="text-white font-medium">
                {data.attainment_percentage !== null
                  ? `${data.attainment_percentage.toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getStatusColor(
                  data.attainment_percentage
                )}`}
                style={{
                  width: `${
                    data.attainment_percentage !== null
                      ? Math.min(data.attainment_percentage, 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Attainment and Quota */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Total Attainment</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(data.total_attainment)}
            </p>
          </div>
          {data.total_quota > 0 ? (
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Quota</p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(data.total_quota)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Quota</p>
              <p className="text-xl font-semibold text-slate-500">Not Set</p>
            </div>
          )}
        </div>

        {/* Remaining */}
        {data.total_quota > 0 && (
          <div className="pt-3 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Remaining:{' '}
              <span className="text-white font-medium">
                {formatCurrency(Math.max(0, data.total_quota - data.total_attainment))}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
