'use client'

import { useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartDataPoint } from '@/lib/dashboard/chartData'
import { format } from 'date-fns'

interface StackedBarChartProps {
  data: ChartDataPoint[]
  productColors: Map<string, string>
  productDisplayNames?: Map<string, string>
  isPresentationMode?: boolean
  tooltipFormatter?: (value: unknown, name: string) => [string, string]
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

export default function StackedBarChart({
  data,
  productColors,
  productDisplayNames,
  isPresentationMode = false,
  tooltipFormatter,
}: StackedBarChartProps) {
  const productKeys = new Set<string>()
  const displayLabel = (key: string) => productDisplayNames?.get(key) ?? key
  data.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') productKeys.add(key)
    })
  })
  const sortedProducts = Array.from(productKeys).sort()

  // #region agent log
  const loggedDates = useRef<Set<string>>(new Set())
  const tzLogged = useRef(false)
  // #endregion

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const formatted = format(d, 'MMM d, yyyy')
      // #region agent log
      if (!tzLogged.current) {
        tzLogged.current = true
        fetch('http://127.0.0.1:7245/ingest/3c35bd42-4cbb-409d-8e6d-f95a48a29e55', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'StackedBarChart.tsx:formatDate',
            message: 'timezone and format context',
            data: {
              timezoneOffsetMinutes: d.getTimezoneOffset(),
              iso: d.toISOString(),
              resolvedTZ: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'n/a',
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'H1',
          }),
        }).catch(() => {})
      }
      if (loggedDates.current.size < 5 && !loggedDates.current.has(dateStr)) {
        loggedDates.current.add(dateStr)
        fetch('http://127.0.0.1:7245/ingest/3c35bd42-4cbb-409d-8e6d-f95a48a29e55', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'StackedBarChart.tsx:formatDate',
            message: 'formatDate in/out',
            data: {
              dateStr,
              iso: d.toISOString(),
              localDay: d.getDate(),
              localMonth: d.getMonth() + 1,
              localYear: d.getFullYear(),
              formatted,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'H1',
          }),
        }).catch(() => {})
      }
      // #endregion
      return formatted
    } catch {
      return dateStr
    }
  }

  if (sortedProducts.length === 0 || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#FFFFFF',
          }}
          labelFormatter={formatDate}
          {...(tooltipFormatter && { formatter: tooltipFormatter })}
        />
        <Legend wrapperStyle={{ color: '#FFFFFF', paddingTop: '20px' }} />
        {sortedProducts.map((productKey, index) => {
          const color = productColors.get(productKey) || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
          return (
            <Bar
              key={productKey}
              dataKey={productKey}
              stackId="1"
              fill={color}
              name={displayLabel(productKey)}
            />
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}
