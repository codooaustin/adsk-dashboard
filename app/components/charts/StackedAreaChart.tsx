'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartDataPoint } from '@/lib/dashboard/chartData'
import { formatChartPeriodDate } from '@/lib/dashboard/formatChartDate'

interface StackedAreaChartProps {
  data: ChartDataPoint[]
  productColors: Map<string, string>
}

export default function StackedAreaChart({ data, productColors }: StackedAreaChartProps) {
  // Get all unique product keys from data
  const productKeys = new Set<string>()
  data.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') {
        productKeys.add(key)
      }
    })
  })

  const sortedProducts = Array.from(productKeys).sort()

  if (sortedProducts.length === 0 || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        No data available
      </div>
    )
  }

  // Get default colors if product color not found
  const defaultColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ]

  const formatDate = formatChartPeriodDate

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          {sortedProducts.map((productKey, index) => {
            const color = productColors.get(productKey) || defaultColors[index % defaultColors.length]
            return (
              <linearGradient key={productKey} id={`color${productKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#FFFFFF',
          }}
          labelFormatter={formatDate}
        />
        <Legend
          wrapperStyle={{ color: '#FFFFFF', paddingTop: '20px' }}
        />
        {sortedProducts.map((productKey, index) => {
          const color = productColors.get(productKey) || defaultColors[index % defaultColors.length]
          return (
            <Area
              key={productKey}
              type="monotone"
              dataKey={productKey}
              stackId="1"
              stroke={color}
              fill={`url(#color${productKey})`}
              name={productKey}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}
