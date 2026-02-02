'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartDataPoint } from '@/lib/dashboard/chartData'
import { format } from 'date-fns'

interface TokensOverTimeChartProps {
  data: ChartDataPoint[]
  productColors: Map<string, string>
  productDisplayNames?: Map<string, string>
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

export default function TokensOverTimeChart({
  data,
  productColors,
  productDisplayNames,
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

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

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
