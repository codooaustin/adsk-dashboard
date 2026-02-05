'use client'

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
import { computePeriodStats, formatStat } from '@/lib/dashboard/chartStats'

interface StackedBarChartProps {
  data: ChartDataPoint[]
  productColors: Map<string, string>
  productDisplayNames?: Map<string, string>
  granularity?: TimeGranularity
  isPresentationMode?: boolean
  tooltipFormatter?: (value: unknown, name: string) => [string, string]
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

type ChartPoint = ChartDataPoint & {
  _periodTotal: number
  _cumulativeTotal: number
}

function renderTooltipContent(
  props: { payload?: Array<{ name?: string; value?: unknown; dataKey: string; payload?: unknown }>; label?: string },
  formatDate: (s: string) => string,
  displayLabel: (key: string) => string,
  tooltipFormatter?: (value: unknown, name: string) => [string, string]
) {
  if (!props.payload?.length || !props.label) return null
  const payload = props.payload
  const point = payload[0]?.payload as ChartPoint | undefined
  const periodTotal = point?._periodTotal ?? payload.reduce((s, p) => s + (Number(p.value) || 0), 0)
  const cumulativeTotal = point?._cumulativeTotal ?? 0
  return (
    <div
      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm shadow-lg"
      style={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '6px', color: '#FFFFFF' }}
    >
      <div className="mb-1 font-medium text-slate-300">{formatDate(props.label)}</div>
      {payload.map((entry) => {
        const [formattedValue, formattedName] = tooltipFormatter
          ? tooltipFormatter(entry.value, String(entry.name ?? ''))
          : [String(entry.value ?? ''), displayLabel(entry.dataKey)]
        return (
          <div key={entry.dataKey} className="flex justify-between gap-4">
            <span>{formattedName}</span>
            <span>{formattedValue}</span>
          </div>
        )
      })}
      <div className="mt-1 border-t border-slate-600 pt-1 flex justify-between gap-4">
        <span>Period total</span>
        <span>{formatStat(periodTotal)}</span>
      </div>
      {cumulativeTotal > 0 && (
        <div className="flex justify-between gap-4">
          <span>Cumulative total</span>
          <span>{formatStat(cumulativeTotal)}</span>
        </div>
      )}
    </div>
  )
}

export default function StackedBarChart({
  data,
  productColors,
  productDisplayNames,
  granularity,
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
  const formatDate = (dateStr: string) => formatChartPeriodDate(dateStr, granularity)

  const stats = computePeriodStats(data, sortedProducts)
  const chartData: ChartPoint[] = data.map((point, i) => ({
    ...point,
    _periodTotal: stats.periodTotals[i] ?? 0,
    _cumulativeTotal: stats.cumulativeTotals[i] ?? 0,
  }))

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
        data={chartData}
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
            renderTooltipContent(
              p as { payload?: Array<{ name?: string; value?: unknown; dataKey: string; payload?: unknown }>; label?: string },
              formatDate,
              displayLabel,
              tooltipFormatter
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
