import { SupabaseClient } from '@supabase/supabase-js'

const RPC_PAGE_SIZE = 1000
const RPC_MAX_ROWS = 100_000

export interface ProductTokenRow {
  productName: string
  monthly: Record<string, number>
  cumulative: number
  avg3m: number
  avg6m: number
  avg12m: number
  avg18m: number
  avg24m: number
  avg36m: number
  avgGrowth3m: number | null
  avgGrowth6m: number | null
  avgGrowth12m: number | null
  avgGrowth18m: number | null
  avgGrowth24m: number | null
  avgGrowth36m: number | null
  cumulativeUsers: number
  avg3mUsers: number
  avg6mUsers: number
  avg12mUsers: number
  avg18mUsers: number
  avg24mUsers: number
  avg36mUsers: number
  avgGrowth3mUsers: number | null
  avgGrowth6mUsers: number | null
  avgGrowth12mUsers: number | null
  avgGrowth18mUsers: number | null
  avgGrowth24mUsers: number | null
  avgGrowth36mUsers: number | null
}

export interface ProductTokenTableData {
  months: string[]
  rows: ProductTokenRow[]
}

export interface ProductTokenTableFilters {
  productNames?: string[]
  startDate?: string | null
  endDate?: string | null
}

/**
 * Fetch raw aggregated token rows by month for an account, with optional product and date filters.
 */
async function fetchAggregatedTokensByMonth(
  accountId: string,
  supabase: SupabaseClient,
  filters?: ProductTokenTableFilters
): Promise<Array<{ period_date: string; product_name: string; tokens_consumed: number }>> {
  const allRows: Array<{ period_date: string; product_name: string; tokens_consumed: number }> = []
  let offset = 0
  const pProductNames =
    filters?.productNames && filters.productNames.length > 0 ? filters.productNames : null
  const pStartDate = filters?.startDate ?? null
  const pEndDate = filters?.endDate ?? null

  while (true) {
    const from = offset
    const to = Math.min(offset + RPC_PAGE_SIZE - 1, RPC_MAX_ROWS - 1)
    const { data, error } = await supabase
      .rpc('get_aggregated_tokens_data', {
        p_account_id: accountId,
        p_granularity: 'month',
        p_source: 'all',
        p_product_names: pProductNames,
        p_start_date: pStartDate,
        p_end_date: pEndDate,
      })
      .range(from, to)

    if (error) {
      console.error('Error calling get_aggregated_tokens_data:', error)
      throw error
    }

    if (!data || data.length === 0) break

    const converted = data.map((row: { period_date: string | null; product_name: string; tokens_consumed: unknown }) => ({
      period_date:
        typeof row.period_date === 'string'
          ? row.period_date
          : row.period_date
            ? new Date(row.period_date).toISOString().split('T')[0]
            : '',
      product_name: row.product_name || 'unknown',
      tokens_consumed: Number(row.tokens_consumed) || 0,
    }))
    allRows.push(...converted.filter((r: { period_date: string }) => r.period_date))
    if (data.length < RPC_PAGE_SIZE || offset + data.length >= RPC_MAX_ROWS) break
    offset += data.length
  }

  return allRows
}

/**
 * Fetch aggregated user counts by month; aggregate by (period_date, product_name) with MAX to approximate distinct users across desktop and cloud.
 */
async function fetchAggregatedUsersByMonth(
  accountId: string,
  supabase: SupabaseClient,
  filters?: ProductTokenTableFilters
): Promise<Array<{ period_date: string; product_name: string; user_count: number }>> {
  const allRows: Array<{ period_date: string; product_name: string; user_count: number }> = []
  let offset = 0
  const pProductNames =
    filters?.productNames && filters.productNames.length > 0 ? filters.productNames : null
  const pStartDate = filters?.startDate ?? null
  const pEndDate = filters?.endDate ?? null

  while (true) {
    const from = offset
    const to = Math.min(offset + RPC_PAGE_SIZE - 1, RPC_MAX_ROWS - 1)
    const { data, error } = await supabase
      .rpc('get_aggregated_users_data', {
        p_account_id: accountId,
        p_granularity: 'month',
        p_source: 'all',
        p_product_names: pProductNames,
        p_start_date: pStartDate,
        p_end_date: pEndDate,
      })
      .range(from, to)

    if (error) {
      console.error('Error calling get_aggregated_users_data:', error)
      throw error
    }

    if (!data || data.length === 0) break

    const converted = data.map((row: { period_date: string | null; product_name: string; user_count: unknown }) => ({
      period_date:
        typeof row.period_date === 'string'
          ? row.period_date
          : row.period_date
            ? new Date(row.period_date).toISOString().split('T')[0]
            : '',
      product_name: row.product_name || 'unknown',
      user_count: Number(row.user_count) || 0,
    }))
    allRows.push(...converted.filter((r: { period_date: string }) => r.period_date))
    if (data.length < RPC_PAGE_SIZE || offset + data.length >= RPC_MAX_ROWS) break
    offset += data.length
  }

  // Aggregate by (period_date, product_name) with MAX (desktop and cloud return separate rows)
  const byKey = new Map<string, number>()
  allRows.forEach((row) => {
    const key = `${row.period_date}|${row.product_name}`
    const current = byKey.get(key) ?? 0
    byKey.set(key, Math.max(current, row.user_count))
  })
  return Array.from(byKey.entries()).map(([key, user_count]) => {
    const idx = key.indexOf('|')
    const period_date = idx >= 0 ? key.slice(0, idx) : key
    const product_name = idx >= 0 ? key.slice(idx + 1) : 'unknown'
    return { period_date, product_name, user_count }
  })
}

/**
 * Fetch distinct user count per product over a date range (union of desktop and cloud).
 * Used for cumulative column so the same user is not counted multiple times across months.
 */
async function fetchDistinctUsersByProduct(
  accountId: string,
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  filters?: ProductTokenTableFilters
): Promise<Map<string, number>> {
  const pProductNames =
    filters?.productNames && filters.productNames.length > 0 ? filters.productNames : null
  const { data, error } = await supabase.rpc('get_distinct_users_by_product', {
    p_account_id: accountId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_product_names: pProductNames,
  })
  if (error) {
    console.error('Error calling get_distinct_users_by_product:', error)
    return new Map()
  }
  const map = new Map<string, number>()
  ;(data ?? []).forEach((row: { product_name: string; user_count: unknown }) => {
    const name = row.product_name || 'unknown'
    map.set(name, Number(row.user_count) || 0)
  })
  return map
}

/**
 * Average month-over-month growth % for a window of months.
 * For each consecutive pair (prev, curr), growth = (curr - prev) / prev * 100 when prev > 0.
 * Returns null when no valid pairs.
 */
function averageMomGrowthPercent(
  monthMap: Map<string, number>,
  windowMonths: string[]
): number | null {
  if (windowMonths.length < 2) return null
  const rates: number[] = []
  for (let i = 0; i < windowMonths.length - 1; i++) {
    const prev = monthMap.get(windowMonths[i]) ?? 0
    const curr = monthMap.get(windowMonths[i + 1]) ?? 0
    if (prev > 0) {
      rates.push((curr - prev) / prev * 100)
    }
  }
  if (rates.length === 0) return null
  return rates.reduce((a, b) => a + b, 0) / rates.length
}

/**
 * Fetch product token table data: monthly columns (all months with data), cumulative, 3/6/12-month averages, and avg growth %.
 */
export async function fetchProductTokenTableData(
  accountId: string,
  supabase: SupabaseClient,
  options?: ProductTokenTableFilters
): Promise<ProductTokenTableData> {
  const [raw, usersRaw] = await Promise.all([
    fetchAggregatedTokensByMonth(accountId, supabase, options),
    fetchAggregatedUsersByMonth(accountId, supabase, options),
  ])

  const productMonths = new Map<string, Map<string, number>>()
  const productMonthsUsers = new Map<string, Map<string, number>>()
  const allMonthsSet = new Set<string>()

  raw.forEach((row) => {
    const periodKey = row.period_date
    if (!periodKey) return
    allMonthsSet.add(periodKey)
    const productName = row.product_name || 'unknown'
    if (!productMonths.has(productName)) {
      productMonths.set(productName, new Map())
    }
    const monthMap = productMonths.get(productName)!
    const current = monthMap.get(periodKey) || 0
    monthMap.set(periodKey, current + row.tokens_consumed)
  })

  usersRaw.forEach((row) => {
    const periodKey = row.period_date
    if (!periodKey) return
    const productName = row.product_name || 'unknown'
    if (!productMonthsUsers.has(productName)) {
      productMonthsUsers.set(productName, new Map())
    }
    productMonthsUsers.get(productName)!.set(periodKey, row.user_count)
  })

  const sortedMonths = Array.from(allMonthsSet).sort()
  const rangeStart = sortedMonths[0] ?? ''
  const rangeEnd = sortedMonths[sortedMonths.length - 1] ?? ''
  const distinctUsersByProduct =
    rangeStart && rangeEnd
      ? await fetchDistinctUsersByProduct(accountId, supabase, rangeStart, rangeEnd, options)
      : new Map<string, number>()

  const rows: ProductTokenRow[] = []

  productMonths.forEach((monthMap, productName) => {
    let cumulative = 0
    const monthly: Record<string, number> = {}
    sortedMonths.forEach((m) => {
      const v = monthMap.get(m) || 0
      cumulative += v
      monthly[m] = v
    })

    const last3 = sortedMonths.slice(-3)
    const last6 = sortedMonths.slice(-6)
    const last12 = sortedMonths.slice(-12)
    const last18 = sortedMonths.slice(-18)
    const last24 = sortedMonths.slice(-24)
    const last36 = sortedMonths.slice(-36)

    const sum3 = last3.reduce((s, m) => s + (monthMap.get(m) || 0), 0)
    const sum6 = last6.reduce((s, m) => s + (monthMap.get(m) || 0), 0)
    const sum12 = last12.reduce((s, m) => s + (monthMap.get(m) || 0), 0)
    const sum18 = last18.reduce((s, m) => s + (monthMap.get(m) || 0), 0)
    const sum24 = last24.reduce((s, m) => s + (monthMap.get(m) || 0), 0)
    const sum36 = last36.reduce((s, m) => s + (monthMap.get(m) || 0), 0)

    const avg3m = last3.length > 0 ? sum3 / last3.length : 0
    const avg6m = last6.length > 0 ? sum6 / last6.length : 0
    const avg12m = last12.length > 0 ? sum12 / last12.length : 0
    const avg18m = last18.length > 0 ? sum18 / last18.length : 0
    const avg24m = last24.length > 0 ? sum24 / last24.length : 0
    const avg36m = last36.length > 0 ? sum36 / last36.length : 0

    const avgGrowth3m = averageMomGrowthPercent(monthMap, last3)
    const avgGrowth6m = averageMomGrowthPercent(monthMap, last6)
    const avgGrowth12m = averageMomGrowthPercent(monthMap, last12)
    const avgGrowth18m = averageMomGrowthPercent(monthMap, last18)
    const avgGrowth24m = averageMomGrowthPercent(monthMap, last24)
    const avgGrowth36m = averageMomGrowthPercent(monthMap, last36)

    const userMonthMap = productMonthsUsers.get(productName) ?? new Map<string, number>()
    const cumulativeUsers = distinctUsersByProduct.get(productName) ?? 0
    const sum3u = last3.reduce((s, m) => s + (userMonthMap.get(m) || 0), 0)
    const sum6u = last6.reduce((s, m) => s + (userMonthMap.get(m) || 0), 0)
    const sum12u = last12.reduce((s, m) => s + (userMonthMap.get(m) || 0), 0)
    const sum18u = last18.reduce((s, m) => s + (userMonthMap.get(m) || 0), 0)
    const sum24u = last24.reduce((s, m) => s + (userMonthMap.get(m) || 0), 0)
    const sum36u = last36.reduce((s, m) => s + (userMonthMap.get(m) || 0), 0)
    const avg3mUsers = last3.length > 0 ? sum3u / last3.length : 0
    const avg6mUsers = last6.length > 0 ? sum6u / last6.length : 0
    const avg12mUsers = last12.length > 0 ? sum12u / last12.length : 0
    const avg18mUsers = last18.length > 0 ? sum18u / last18.length : 0
    const avg24mUsers = last24.length > 0 ? sum24u / last24.length : 0
    const avg36mUsers = last36.length > 0 ? sum36u / last36.length : 0
    const avgGrowth3mUsers = averageMomGrowthPercent(userMonthMap, last3)
    const avgGrowth6mUsers = averageMomGrowthPercent(userMonthMap, last6)
    const avgGrowth12mUsers = averageMomGrowthPercent(userMonthMap, last12)
    const avgGrowth18mUsers = averageMomGrowthPercent(userMonthMap, last18)
    const avgGrowth24mUsers = averageMomGrowthPercent(userMonthMap, last24)
    const avgGrowth36mUsers = averageMomGrowthPercent(userMonthMap, last36)

    rows.push({
      productName,
      monthly,
      cumulative,
      avg3m,
      avg6m,
      avg12m,
      avg18m,
      avg24m,
      avg36m,
      avgGrowth3m,
      avgGrowth6m,
      avgGrowth12m,
      avgGrowth18m,
      avgGrowth24m,
      avgGrowth36m,
      cumulativeUsers,
      avg3mUsers,
      avg6mUsers,
      avg12mUsers,
      avg18mUsers,
      avg24mUsers,
      avg36mUsers,
      avgGrowth3mUsers,
      avgGrowth6mUsers,
      avgGrowth12mUsers,
      avgGrowth18mUsers,
      avgGrowth24mUsers,
      avgGrowth36mUsers,
    })
  })

  rows.sort((a, b) => a.productName.localeCompare(b.productName))

  return {
    months: sortedMonths,
    rows,
  }
}
