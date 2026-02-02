'use client'

import { useState, useEffect } from 'react'

interface QuotaAttainmentData {
  fiscal_year: number
  total_attainment: number
  quota: number | null
  attainment_percentage: number | null
}

interface QuotaAttainmentDisplayProps {
  accountSlug: string
  fiscalYear?: number
}

export default function QuotaAttainmentDisplay({
  accountSlug,
  fiscalYear,
}: QuotaAttainmentDisplayProps) {
  const [data, setData] = useState<QuotaAttainmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuotaAttainment()
  }, [accountSlug, fiscalYear])

  const fetchQuotaAttainment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = fiscalYear
        ? `/api/accounts/${accountSlug}/quota-attainment?fiscal_year=${fiscalYear}`
        : `/api/accounts/${accountSlug}/quota-attainment`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch quota attainment')
      }

      const result = await response.json()
      // If fiscal year specified, result is a single object, otherwise array
      const dataArray = Array.isArray(result) ? result : [result]
      setData(dataArray)
    } catch (error) {
      console.error('Error fetching quota attainment:', error)
      setError('Failed to load quota attainment data')
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
    return <div className="text-slate-400 text-sm">Loading quota attainment...</div>
  }

  if (error) {
    return <div className="text-red-400 text-sm">{error}</div>
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No quota attainment data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div
          key={item.fiscal_year}
          className="p-6 bg-slate-800 border border-slate-700 rounded-lg"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Fiscal Year {item.fiscal_year}
              </h3>
              {item.quota === null && (
                <p className="text-sm text-slate-400 mt-1">
                  No quota set for this fiscal year
                </p>
              )}
            </div>
            {item.attainment_percentage !== null && (
              <div
                className={`px-3 py-1 rounded text-sm font-medium ${
                  item.attainment_percentage >= 100
                    ? 'bg-green-900/30 text-green-400'
                    : item.attainment_percentage >= 75
                    ? 'bg-hello-yellow/20 text-hello-yellow'
                    : item.attainment_percentage >= 50
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {getStatusText(item.attainment_percentage)}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Progress Bar */}
            {item.quota !== null && item.quota > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white font-medium">
                    {item.attainment_percentage !== null
                      ? `${item.attainment_percentage.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStatusColor(
                      item.attainment_percentage
                    )}`}
                    style={{
                      width: `${
                        item.attainment_percentage !== null
                          ? Math.min(item.attainment_percentage, 100)
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
                <p className="text-sm text-slate-400 mb-1">Attainment</p>
                <p className="text-xl font-semibold text-white">
                  {formatCurrency(item.total_attainment)}
                </p>
              </div>
              {item.quota !== null ? (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Quota</p>
                  <p className="text-xl font-semibold text-white">
                    {formatCurrency(item.quota)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Quota</p>
                  <p className="text-xl font-semibold text-slate-500">Not Set</p>
                </div>
              )}
            </div>

            {/* Remaining */}
            {item.quota !== null && item.quota > 0 && (
              <div className="pt-3 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  Remaining:{' '}
                  <span className="text-white font-medium">
                    {formatCurrency(Math.max(0, item.quota - item.total_attainment))}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
