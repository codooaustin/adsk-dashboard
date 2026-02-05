import type { ChartDataPoint } from './chartData'

export interface PeriodStats {
  periodTotals: number[]
  cumulativeTotals: number[]
  average: number
  high: number
  low: number
  indexOfHigh: number
  indexOfLow: number
}

/**
 * Compute period totals (sum across products per point), cumulative totals,
 * and average/high/low with indices for reference line/dot placement.
 */
export function computePeriodStats(
  data: ChartDataPoint[],
  productKeys: string[]
): PeriodStats {
  const periodTotals = data.map((point) => {
    let sum = 0
    for (const key of productKeys) {
      const v = point[key]
      if (typeof v === 'number') sum += v
    }
    return sum
  })
  let running = 0
  const cumulativeTotals = periodTotals.map((t) => {
    running += t
    return running
  })
  const n = periodTotals.length
  const sum = periodTotals.reduce((a, b) => a + b, 0)
  const average = n > 0 ? sum / n : 0
  const high = n > 0 ? Math.max(...periodTotals) : 0
  const low = n > 0 ? Math.min(...periodTotals) : 0
  const indexOfHigh = periodTotals.findIndex((t) => t === high)
  const indexOfLow = periodTotals.findIndex((t) => t === low)
  return {
    periodTotals,
    cumulativeTotals,
    average,
    high,
    low,
    indexOfHigh: indexOfHigh >= 0 ? indexOfHigh : 0,
    indexOfLow: indexOfLow >= 0 ? indexOfLow : 0,
  }
}

/**
 * Format a stat value for display in chart labels (avg/high/low).
 */
export function formatStat(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e6) return (value / 1e6).toFixed(1) + 'M'
  if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K'
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 })
}
