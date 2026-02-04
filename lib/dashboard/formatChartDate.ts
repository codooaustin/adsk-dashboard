import { format } from 'date-fns'
import type { TimeGranularity } from '@/lib/dashboard/chartData'

/**
 * Format a chart period date string for display (x-axis, tooltips).
 * Date-only strings (YYYY-MM-DD) from the API are parsed as local calendar dates
 * so that e.g. "2025-10-01" always displays as "Oct 1, 2025" regardless of timezone.
 * When granularity is 'month', displays only "MMM yyyy" (e.g. "Sep 2025").
 */
export function formatChartPeriodDate(dateStr: string, granularity?: TimeGranularity): string {
  const formatStr = granularity === 'month' ? 'MMM yyyy' : 'MMM d, yyyy'
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      return format(date, formatStr)
    }
    return format(new Date(dateStr), formatStr)
  } catch {
    return dateStr
  }
}
