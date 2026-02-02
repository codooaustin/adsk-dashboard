import { SupabaseClient } from '@supabase/supabase-js'

export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface TimeSeriesDataPoint {
  date: string
  product_key: string
  tokens: number
  events: number
  users: number
}

export interface ChartDataPoint {
  date: string
  [productKey: string]: string | number
}

/**
 * Fetch time-series data for tokens chart
 */
export async function fetchTokensTimeSeriesData(
  accountId: string,
  granularity: TimeGranularity,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  // Fetch all data and aggregate in JavaScript
  const { data: allData } = await supabase
    .from('usage_facts')
    .select('date, product_key, metric_tokens')
    .eq('account_id', accountId)
    .not('metric_tokens', 'is', null)
    .order('date', { ascending: true })

  return aggregateTimeSeriesData(allData || [], granularity, 'tokens')
}

/**
 * Fetch time-series data for events chart
 */
export async function fetchEventsTimeSeriesData(
  accountId: string,
  granularity: TimeGranularity,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  // Fetch all data and aggregate in JavaScript
  const { data: allData } = await supabase
    .from('usage_facts')
    .select('date, product_key, metric_events')
    .eq('account_id', accountId)
    .not('metric_events', 'is', null)
    .order('date', { ascending: true })

  return aggregateTimeSeriesData(allData || [], granularity, 'events')
}

/**
 * Fetch time-series data for stacked area chart (by product)
 */
export async function fetchTimeSeriesData(
  accountId: string,
  granularity: TimeGranularity,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  return fetchTokensTimeSeriesData(accountId, granularity, supabase)
}

/**
 * Aggregate time series data by granularity
 */
function aggregateTimeSeriesData(
  data: any[],
  granularity: TimeGranularity,
  metricType: 'tokens' | 'events' = 'tokens'
): ChartDataPoint[] {
  const grouped = new Map<string, Map<string, number>>()

  data.forEach((row) => {
    if (!row.date) return

    const date = new Date(row.date)
    let periodKey: string

    switch (granularity) {
      case 'week':
        // Get Monday of the week
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date)
        monday.setDate(diff)
        periodKey = monday.toISOString().split('T')[0]
        break
      case 'month':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        break
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3)
        periodKey = `${date.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`
        break
      case 'year':
        periodKey = `${date.getFullYear()}-01-01`
        break
      default: // day
        periodKey = row.date
    }

    const productKey = row.product_key || 'unknown'
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, new Map())
    }
    const periodData = grouped.get(periodKey)!
    const currentValue = periodData.get(productKey) || 0
    const metricValue = metricType === 'tokens' 
      ? Number(row.metric_tokens) || 0
      : Number(row.metric_events) || 0
    periodData.set(productKey, currentValue + metricValue)
  })

  // Convert to chart data format
  const result: ChartDataPoint[] = []
  const sortedPeriods = Array.from(grouped.keys()).sort()

  sortedPeriods.forEach((period) => {
    const periodData = grouped.get(period)!
    const dataPoint: ChartDataPoint = { date: period }

    periodData.forEach((value, productKey) => {
      dataPoint[productKey] = value
    })

    result.push(dataPoint)
  })

  return result
}

/**
 * Fetch product colors from database
 */
export async function fetchProductColors(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const { data: products } = await supabase.from('products').select('product_key, color')

  const colorMap = new Map<string, string>()
  products?.forEach((product) => {
    if (product.product_key && product.color) {
      colorMap.set(product.product_key, product.color)
    }
  })

  return colorMap
}
