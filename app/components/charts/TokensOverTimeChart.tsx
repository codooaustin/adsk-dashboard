'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartDataPoint, TimeGranularity } from '@/lib/dashboard/chartData'
import { formatChartPeriodDate } from '@/lib/dashboard/formatChartDate'
import { formatStat } from '@/lib/dashboard/chartStats'

interface TokensOverTimeChartProps {
  data: ChartDataPoint[]
  productColors: Map<string, string>
  productDisplayNames?: Map<string, string>
  granularity?: TimeGranularity
  isPresentationMode?: boolean
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

function calculateCumulativeData(data: ChartDataPoint[]): ChartDataPoint[] {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const cumulativeTotals = new Map<string, number>()
  const allProductKeys = new Set<string>()
  sorted.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') allProductKeys.add(key)
    })
  })
  allProductKeys.forEach((k) => cumulativeTotals.set(k, 0))
  return sorted.map((point) => {
    const cumulativePoint: ChartDataPoint = { date: point.date }
    allProductKeys.forEach((productKey) => {
      const current = (point[productKey] as number) || 0
      const prev = cumulativeTotals.get(productKey) || 0
      const next = prev + current
      cumulativeTotals.set(productKey, next)
      cumulativePoint[productKey] = next
    })
    return cumulativePoint
  })
}

function TokensOverTimeTooltipContent(
  props: { payload?: Array<{ name?: string; value?: unknown; dataKey: string }>; label?: string },
  formatDate: (s: string) => string,
  displayLabel: (key: string) => string
) {
  if (!props.payload?.length || !props.label) return null
  const total = props.payload.reduce((s, p) => s + (Number(p.value) || 0), 0)
  return (
    <div
      className="rounded-lg border border-slate-600 px-3 py-2 text-sm shadow-lg"
      style={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '6px', color: '#FFFFFF' }}
    >
      <div className="mb-1 font-medium text-slate-300">{formatDate(props.label)}</div>
      {props.payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span>{displayLabel(entry.dataKey)}</span>
          <span>{formatStat(Number(entry.value))}</span>
        </div>
      ))}
      <div className="mt-1 border-t border-slate-600 pt-1 flex justify-between gap-4">
        <span>Cumulative total</span>
        <span>{formatStat(total)}</span>
      </div>
    </div>
  )
}

export default function TokensOverTimeChart({
  data,
  productColors,
  productDisplayNames,
  granularity,
  isPresentationMode = false,
}: TokensOverTimeChartProps) {
  const cumulativeData = useMemo(() => calculateCumulativeData(data), [data])
  const displayLabel = (key: string) => productDisplayNames?.get(key) ?? key
  const productKeys = new Set<string>()
  cumulativeData.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') productKeys.add(key)
    })
  })
  const sortedProducts = Array.from(productKeys).sort()
  const formatDate = (dateStr: string) => formatChartPeriodDate(dateStr, granularity)

  if (sortedProducts.length === 0 || cumulativeData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={cumulativeData}
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
          content={(p) =>
            TokensOverTimeTooltipContent(
              p as { payload?: Array<{ name?: string; value?: unknown; dataKey: string }>; label?: string },
              formatDate,
              displayLabel
            )
          }
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
