import { SupabaseClient } from '@supabase/supabase-js'
import { TimeGranularity, ChartDataPoint } from './chartData'

export interface RawChartFilters {
  source: 'all' | 'desktop' | 'cloud'
  productNames: string[]
  startDate?: string | null // ISO date string (YYYY-MM-DD) or null for no start filter
  endDate?: string | null // ISO date string (YYYY-MM-DD) or null for no end filter
}

/**
 * Aggregate time series data by granularity (reused from chartData.ts logic)
 */
function aggregateTimeSeriesData(
  data: Array<{ usage_date: string; product_name: string; tokens_consumed: number | null }>,
  granularity: TimeGranularity
): ChartDataPoint[] {
  const grouped = new Map<string, Map<string, number>>()

  data.forEach((row) => {
    if (!row.usage_date) return

    const date = new Date(row.usage_date)
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
        periodKey = row.usage_date
    }

    const productName = row.product_name || 'unknown'
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, new Map())
    }
    const periodData = grouped.get(periodKey)!
    const currentValue = periodData.get(productName) || 0
    const metricValue = Number(row.tokens_consumed) || 0
    periodData.set(productName, currentValue + metricValue)
  })

  // Convert to chart data format
  const result: ChartDataPoint[] = []
  const sortedPeriods = Array.from(grouped.keys()).sort()

  sortedPeriods.forEach((period) => {
    const periodData = grouped.get(period)!
    const dataPoint: ChartDataPoint = { date: period }

    periodData.forEach((value, productName) => {
      dataPoint[productName] = value
    })

    result.push(dataPoint)
  })

  return result
}

/**
 * Fetch all rows from a table with pagination
 * Uses proper pagination to handle Supabase's default 1000-row limit
 * @param queryBuilderFactory - Function that returns a fresh query builder for each page (to avoid mutation)
 */
export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  queryBuilderFactory: () => any,  // Changed to function that returns query builder
  pageSize: number = 1000  // Changed to 1000 to respect Supabase API max_rows limit
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0
  let hasMore = true
  let pageCount = 0
  let totalCount: number | null = null

  while (hasMore) {
    pageCount++
    
    // Rebuild the query for each page to avoid mutation issues
    const queryBuilder = queryBuilderFactory()
    const { data, error, count } = await queryBuilder.range(from, from + pageSize - 1)

    if (error) {
      console.error(`Error fetching page ${pageCount} from ${table} (range ${from}-${from + pageSize - 1}):`, error)
      break
    }

    // Get count from first page if available
    if (pageCount === 1 && count !== null) {
      totalCount = count
      console.log(`Fetching ${count} total rows from ${table} (${Math.ceil(count / pageSize)} pages)`)
    }

    if (data && data.length > 0) {
      allRows.push(...data)
      const fetchedSoFar = allRows.length
      console.log(`Fetched page ${pageCount} from ${table}: ${data.length} rows (total so far: ${fetchedSoFar}${totalCount ? `/${totalCount}` : ''})`)
      
      from += pageSize
      // Continue if we got a full page (meaning there might be more)
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  // Verify we got all expected rows
  if (totalCount !== null && allRows.length !== totalCount) {
    console.warn(
      `Row count mismatch for ${table}: expected ${totalCount}, got ${allRows.length}. ` +
      `This may indicate pagination issues or data changes during fetch.`
    )
  } else if (totalCount !== null) {
    console.log(`Successfully fetched all ${allRows.length} rows from ${table}`)
  } else {
    console.log(`Fetched ${allRows.length} rows from ${table} (count not available)`)
  }

  return allRows
}

/**
 * Fetch aggregated time-series data for tokens using SQL aggregation
 * This uses a PostgreSQL function to aggregate at the database level for performance
 */
const AGGREGATED_RPC_PAGE_SIZE = 1000
const AGGREGATED_RPC_MAX_ROWS = 100_000

async function fetchAggregatedTokensData(
  accountId: string,
  granularity: TimeGranularity,
  filters: RawChartFilters,
  supabase: SupabaseClient
): Promise<Array<{ period_date: string; product_name: string; tokens_consumed: number }>> {
  const allRows: Array<{ period_date: string; product_name: string; tokens_consumed: number }> = []
  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const from = offset
    const to = Math.min(offset + AGGREGATED_RPC_PAGE_SIZE - 1, AGGREGATED_RPC_MAX_ROWS - 1)
    const { data, error } = await supabase
      .rpc('get_aggregated_tokens_data', {
        p_account_id: accountId,
        p_granularity: granularity,
        p_source: filters.source,
        p_product_names: filters.productNames.length > 0 ? filters.productNames : null,
        p_start_date: filters.startDate || null,
        p_end_date: filters.endDate || null,
      })
      .range(from, to)

    if (error) {
      console.error('Error calling get_aggregated_tokens_data:', error)
      throw error
    }

    if (!data || data.length === 0) break

    const converted = data.map((row: any) => ({
      period_date: typeof row.period_date === 'string'
        ? row.period_date
        : new Date(row.period_date).toISOString().split('T')[0],
      product_name: row.product_name,
      tokens_consumed: Number(row.tokens_consumed) || 0,
    }))
    allRows.push(...converted)
    if (data.length < AGGREGATED_RPC_PAGE_SIZE || offset + data.length >= AGGREGATED_RPC_MAX_ROWS) break
    offset += data.length
  }

  return allRows
}

/**
 * Convert aggregated SQL results to ChartDataPoint format
 */
function convertAggregatedToChartData(
  aggregatedData: Array<{ period_date: string; product_name: string; tokens_consumed: number }>
): ChartDataPoint[] {
  const grouped = new Map<string, Map<string, number>>()

  aggregatedData.forEach((row) => {
    if (!row.period_date) return

    const periodKey = row.period_date
    const productName = row.product_name || 'unknown'
    
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, new Map())
    }
    const periodData = grouped.get(periodKey)!
    // Sum tokens if the same product appears multiple times (e.g., from desktop and cloud)
    const currentValue = periodData.get(productName) || 0
    periodData.set(productName, currentValue + row.tokens_consumed)
  })

  // Convert to chart data format
  const result: ChartDataPoint[] = []
  const sortedPeriods = Array.from(grouped.keys()).sort()

  sortedPeriods.forEach((period) => {
    const periodData = grouped.get(period)!
    const dataPoint: ChartDataPoint = { date: period }

    periodData.forEach((value, productName) => {
      dataPoint[productName] = value
    })

    result.push(dataPoint)
  })

  return result
}

/**
 * Fetch time-series data for tokens from raw tables
 * Uses SQL aggregation for performance when possible, falls back to row fetching if needed
 */
export async function fetchRawTokensTimeSeriesData(
  accountId: string,
  granularity: TimeGranularity,
  filters: RawChartFilters,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  try {
    // Use SQL aggregation for better performance
    const aggregatedData = await fetchAggregatedTokensData(accountId, granularity, filters, supabase)
    
    if (aggregatedData.length > 0) {
      console.log(`Fetched ${aggregatedData.length} aggregated rows using SQL aggregation`)
      return convertAggregatedToChartData(aggregatedData)
    }
    
    return []
  } catch (error) {
    // Fallback to old method if SQL aggregation fails (e.g., function doesn't exist yet)
    console.warn('SQL aggregation failed, falling back to row fetching:', error)
    return fetchRawTokensTimeSeriesDataLegacy(accountId, granularity, filters, supabase)
  }
}

/**
 * Legacy method: Fetch all rows and aggregate in JavaScript
 * Kept as fallback for compatibility
 */
async function fetchRawTokensTimeSeriesDataLegacy(
  accountId: string,
  granularity: TimeGranularity,
  filters: RawChartFilters,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  const allData: Array<{ usage_date: string; product_name: string; tokens_consumed: number | null }> = []

  // Build query functions for parallel execution
  const buildDesktopQuery = () => {
    let query = supabase
      .from('daily_user_desktop_raw')
      .select('usage_date, product_name, tokens_consumed', { count: 'exact' })
      .eq('account_id', accountId)
      .not('tokens_consumed', 'is', null)
      .order('usage_date', { ascending: true })

    if (filters.productNames.length > 0) {
      query = query.in('product_name', filters.productNames)
    }
    return query
  }

  const buildCloudQuery = () => {
    let query = supabase
      .from('daily_user_cloud_raw')
      .select('usage_date, product_name, tokens_consumed', { count: 'exact' })
      .eq('account_id', accountId)
      .not('tokens_consumed', 'is', null)
      .order('usage_date', { ascending: true })

    if (filters.productNames.length > 0) {
      query = query.in('product_name', filters.productNames)
    }
    return query
  }

  type Chunk = { source: 'desktop' | 'cloud'; data: Array<{ usage_date: string; product_name: string; tokens_consumed: number | null }> }
  const queryPromises: Promise<Chunk>[] = []

  if (filters.source === 'all' || filters.source === 'desktop') {
    queryPromises.push(
      fetchAllRows<{ usage_date: string; product_name: string; tokens_consumed: number | null }>(
        supabase,
        'daily_user_desktop_raw',
        buildDesktopQuery
      ).then((data) => {
        console.log(`Fetched ${data.length} rows from daily_user_desktop_raw`)
        return { source: 'desktop' as const, data }
      })
    )
  }

  if (filters.source === 'all' || filters.source === 'cloud') {
    queryPromises.push(
      fetchAllRows<{ usage_date: string; product_name: string; tokens_consumed: number | null }>(
        supabase,
        'daily_user_cloud_raw',
        buildCloudQuery
      ).then((data) => {
        console.log(`Fetched ${data.length} rows from daily_user_cloud_raw`)
        return { source: 'cloud' as const, data }
      })
    )
  }

  // Wait for all queries to complete in parallel
  const results = await Promise.all(queryPromises)

  // Combine results
  results.forEach(({ data }) => {
    if (data.length > 0) {
      const chunkSize = 10000
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, Math.min(i + chunkSize, data.length))
        Array.prototype.push.apply(allData, chunk)
      }
    }
  })

  return aggregateTimeSeriesData(allData, granularity)
}

/**
 * Fetch aggregated time-series data for hours using SQL aggregation
 * This uses a PostgreSQL function to aggregate at the database level for performance
 */
async function fetchAggregatedHoursData(
  accountId: string,
  granularity: TimeGranularity,
  filters: Omit<RawChartFilters, 'source'>,
  supabase: SupabaseClient
): Promise<Array<{ period_date: string; product_name: string; usage_hours: number }>> {
  const allRows: Array<{ period_date: string; product_name: string; usage_hours: number }> = []
  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const from = offset
    const to = Math.min(offset + AGGREGATED_RPC_PAGE_SIZE - 1, AGGREGATED_RPC_MAX_ROWS - 1)
    const { data, error } = await supabase
      .rpc('get_aggregated_hours_data', {
        p_account_id: accountId,
        p_granularity: granularity,
        p_product_names: filters.productNames.length > 0 ? filters.productNames : null,
        p_start_date: filters.startDate || null,
        p_end_date: filters.endDate || null,
      })
      .range(from, to)

    if (error) {
      console.error('Error calling get_aggregated_hours_data:', error)
      throw error
    }

    if (!data || data.length === 0) break

    const converted = data.map((row: any) => ({
      period_date: typeof row.period_date === 'string'
        ? row.period_date
        : new Date(row.period_date).toISOString().split('T')[0],
      product_name: row.product_name,
      usage_hours: Number(row.usage_hours) || 0,
    }))
    allRows.push(...converted)
    if (data.length < AGGREGATED_RPC_PAGE_SIZE || offset + data.length >= AGGREGATED_RPC_MAX_ROWS) break
    offset += data.length
  }

  return allRows
}

/**
 * Convert aggregated hours SQL results to ChartDataPoint format
 */
function convertAggregatedHoursToChartData(
  aggregatedData: Array<{ period_date: string; product_name: string; usage_hours: number }>
): ChartDataPoint[] {
  const grouped = new Map<string, Map<string, number>>()

  aggregatedData.forEach((row) => {
    if (!row.period_date) return

    const periodKey = row.period_date
    const productName = row.product_name || 'unknown'
    
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, new Map())
    }
    const periodData = grouped.get(periodKey)!
    // Sum hours if the same product appears multiple times
    const currentValue = periodData.get(productName) || 0
    periodData.set(productName, currentValue + row.usage_hours)
  })

  // Convert to chart data format
  const result: ChartDataPoint[] = []
  const sortedPeriods = Array.from(grouped.keys()).sort()

  sortedPeriods.forEach((period) => {
    const periodData = grouped.get(period)!
    const dataPoint: ChartDataPoint = { date: period }

    periodData.forEach((value, productName) => {
      dataPoint[productName] = value
    })

    result.push(dataPoint)
  })

  return result
}

/**
 * Legacy method: Fetch all rows and aggregate hours in JavaScript
 * Kept as fallback for compatibility
 */
async function fetchRawHoursTimeSeriesDataLegacy(
  accountId: string,
  granularity: TimeGranularity,
  filters: Omit<RawChartFilters, 'source'>,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  // Build query function
  const buildQuery = () => {
    let query = supabase
      .from('daily_user_desktop_raw')
      .select('usage_date, product_name, usage_hours', { count: 'exact' })
      .eq('account_id', accountId)
      .not('usage_hours', 'is', null)
      .order('usage_date', { ascending: true })

    if (filters.productNames.length > 0) {
      query = query.in('product_name', filters.productNames)
    }
    if (filters.startDate) {
      query = query.gte('usage_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('usage_date', filters.endDate)
    }
    return query
  }

  const data = await fetchAllRows<{ usage_date: string; product_name: string; usage_hours: number | null }>(
    supabase,
    'daily_user_desktop_raw',
    buildQuery
  )
  const forAggregate = data.map((r) => ({
    usage_date: r.usage_date,
    product_name: r.product_name,
    tokens_consumed: r.usage_hours,
  }))
  return aggregateTimeSeriesData(forAggregate, granularity)
}

/**
 * Fetch time-series data for hours from raw tables
 * Uses SQL aggregation for performance when possible, falls back to row fetching if needed
 */
export async function fetchRawHoursTimeSeriesData(
  accountId: string,
  granularity: TimeGranularity,
  filters: Omit<RawChartFilters, 'source'>,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  try {
    // Use SQL aggregation for better performance
    const aggregatedData = await fetchAggregatedHoursData(accountId, granularity, filters, supabase)
    
    if (aggregatedData.length > 0) {
      console.log(`Fetched ${aggregatedData.length} aggregated hours rows using SQL aggregation`)
      return convertAggregatedHoursToChartData(aggregatedData)
    }
    
    return []
  } catch (error) {
    // Fallback to old method if SQL aggregation fails (e.g., function doesn't exist yet)
    console.warn('SQL aggregation failed, falling back to row fetching:', error)
    return fetchRawHoursTimeSeriesDataLegacy(accountId, granularity, filters, supabase)
  }
}

/**
 * Fetch aggregated time-series data for users using SQL aggregation
 * This uses a PostgreSQL function to aggregate at the database level for performance
 */
async function fetchAggregatedUsersData(
  accountId: string,
  granularity: TimeGranularity,
  filters: RawChartFilters,
  supabase: SupabaseClient
): Promise<Array<{ period_date: string; product_name: string; user_count: number }>> {
  const allRows: Array<{ period_date: string; product_name: string; user_count: number }> = []
  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const from = offset
    const to = Math.min(offset + AGGREGATED_RPC_PAGE_SIZE - 1, AGGREGATED_RPC_MAX_ROWS - 1)
    const { data, error } = await supabase
      .rpc('get_aggregated_users_data', {
        p_account_id: accountId,
        p_granularity: granularity,
        p_source: filters.source,
        p_product_names: filters.productNames.length > 0 ? filters.productNames : null,
        p_start_date: filters.startDate || null,
        p_end_date: filters.endDate || null,
      })
      .range(from, to)

    if (error) {
      console.error('Error calling get_aggregated_users_data:', error)
      throw error
    }

    if (!data || data.length === 0) break

    const converted = data.map((row: any) => ({
      period_date: typeof row.period_date === 'string'
        ? row.period_date
        : new Date(row.period_date).toISOString().split('T')[0],
      product_name: row.product_name,
      user_count: Number(row.user_count) || 0,
    }))
    allRows.push(...converted)
    if (data.length < AGGREGATED_RPC_PAGE_SIZE || offset + data.length >= AGGREGATED_RPC_MAX_ROWS) break
    offset += data.length
  }

  return allRows
}

/**
 * Convert aggregated users SQL results to ChartDataPoint format
 * Combines desktop and cloud results when source='all'
 * 
 * Note: When source='all', the SQL function returns separate rows for desktop and cloud.
 * Each row contains COUNT(DISTINCT user_name) for that source. Since we only have counts
 * (not the actual user names), we can't compute the true union of unique users.
 * We use the maximum count as a reasonable approximation, which assumes minimal overlap
 * between desktop and cloud users for the same period/product.
 * 
 * For more accurate results, the SQL function could be improved to UNION the user_name
 * values from both sources, then COUNT(DISTINCT) the combined set.
 */
function convertAggregatedUsersToChartData(
  aggregatedData: Array<{ period_date: string; product_name: string; user_count: number }>
): ChartDataPoint[] {
  const grouped = new Map<string, Map<string, number>>()

  aggregatedData.forEach((row) => {
    if (!row.period_date) return

    const periodKey = row.period_date
    const productName = row.product_name || 'unknown'
    
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, new Map())
    }
    const periodData = grouped.get(periodKey)!
    // Take the maximum count per period/product (approximation for source='all')
    // This assumes users don't significantly overlap between desktop and cloud
    // For source='desktop' or 'cloud', there's only one row per period/product, so max = that value
    const currentValue = periodData.get(productName) || 0
    periodData.set(productName, Math.max(currentValue, row.user_count))
  })

  // Convert to chart data format
  const result: ChartDataPoint[] = []
  const sortedPeriods = Array.from(grouped.keys()).sort()

  sortedPeriods.forEach((period) => {
    const periodData = grouped.get(period)!
    const dataPoint: ChartDataPoint = { date: period }

    periodData.forEach((value, productName) => {
      dataPoint[productName] = value
    })

    result.push(dataPoint)
  })

  return result
}

/**
 * Aggregate unique users time series data by granularity from desktop and cloud tables
 * Groups by period and product, counting unique user_name per combination
 */
function aggregateUsersTimeSeriesDataFromDesktopCloud(
  data: Array<{ usage_date: string; product_name: string; user_name: string }>,
  granularity: TimeGranularity
): ChartDataPoint[] {
  // Map<periodKey, Map<productName, Set<user_name>>>
  const grouped = new Map<string, Map<string, Set<string>>>()

  data.forEach((row) => {
    if (!row.usage_date || !row.user_name) return

    const date = new Date(row.usage_date)
    let periodKey: string

    switch (granularity) {
      case 'week':
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
        periodKey = row.usage_date
    }

    const productName = row.product_name || 'unknown'
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, new Map())
    }
    const periodData = grouped.get(periodKey)!
    if (!periodData.has(productName)) {
      periodData.set(productName, new Set<string>())
    }
    // Add user_name to the set (Set automatically handles uniqueness)
    periodData.get(productName)!.add(row.user_name)
  })

  // Convert to chart data format
  const result: ChartDataPoint[] = []
  const sortedPeriods = Array.from(grouped.keys()).sort()

  sortedPeriods.forEach((period) => {
    const periodData = grouped.get(period)!
    const dataPoint: ChartDataPoint = { date: period }

    periodData.forEach((userSet, productName) => {
      // Count unique users (size of the Set)
      dataPoint[productName] = userSet.size
    })

    result.push(dataPoint)
  })

  return result
}

/**
 * Legacy method: Fetch all rows and aggregate users in JavaScript
 * Kept as fallback for compatibility
 */
async function fetchRawUsersTimeSeriesDataFromDesktopCloudLegacy(
  accountId: string,
  granularity: TimeGranularity,
  filters: RawChartFilters,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  const allData: Array<{ usage_date: string; product_name: string; user_name: string }> = []

  // Build query functions for parallel execution
  const buildDesktopQuery = () => {
    let query = supabase
      .from('daily_user_desktop_raw')
      .select('usage_date, product_name, user_name', { count: 'exact' })
      .eq('account_id', accountId)
      .not('user_name', 'is', null)
      .order('usage_date', { ascending: true })

    if (filters.productNames.length > 0) {
      query = query.in('product_name', filters.productNames)
    }
    if (filters.startDate) {
      query = query.gte('usage_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('usage_date', filters.endDate)
    }
    return query
  }

  const buildCloudQuery = () => {
    let query = supabase
      .from('daily_user_cloud_raw')
      .select('usage_date, product_name, user_name', { count: 'exact' })
      .eq('account_id', accountId)
      .not('user_name', 'is', null)
      .order('usage_date', { ascending: true })

    if (filters.productNames.length > 0) {
      query = query.in('product_name', filters.productNames)
    }
    if (filters.startDate) {
      query = query.gte('usage_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('usage_date', filters.endDate)
    }
    return query
  }

  type Chunk = { source: 'desktop' | 'cloud'; data: Array<{ usage_date: string; product_name: string; user_name: string }> }
  const queryPromises: Promise<Chunk>[] = []

  if (filters.source === 'all' || filters.source === 'desktop') {
    queryPromises.push(
      fetchAllRows<{ usage_date: string; product_name: string; user_name: string }>(
        supabase,
        'daily_user_desktop_raw',
        buildDesktopQuery
      ).then((data) => {
        console.log(`Fetched ${data.length} rows from daily_user_desktop_raw for users`)
        return { source: 'desktop' as const, data }
      })
    )
  }

  if (filters.source === 'all' || filters.source === 'cloud') {
    queryPromises.push(
      fetchAllRows<{ usage_date: string; product_name: string; user_name: string }>(
        supabase,
        'daily_user_cloud_raw',
        buildCloudQuery
      ).then((data) => {
        console.log(`Fetched ${data.length} rows from daily_user_cloud_raw for users`)
        return { source: 'cloud' as const, data }
      })
    )
  }

  // Wait for all queries to complete in parallel
  const results = await Promise.all(queryPromises)

  // Combine results
  results.forEach(({ data }) => {
    if (data.length > 0) {
      allData.push(...data)
    }
  })

  return aggregateUsersTimeSeriesDataFromDesktopCloud(allData, granularity)
}

/**
 * Fetch time-series data for unique users from desktop and cloud raw tables
 * Uses SQL aggregation for performance when possible, falls back to row fetching if needed
 * Returns counts of unique users per period/product combination
 */
export async function fetchRawUsersTimeSeriesDataFromDesktopCloud(
  accountId: string,
  granularity: TimeGranularity,
  filters: RawChartFilters,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  try {
    // Use SQL aggregation for better performance
    const aggregatedData = await fetchAggregatedUsersData(accountId, granularity, filters, supabase)
    
    if (aggregatedData.length > 0) {
      console.log(`Fetched ${aggregatedData.length} aggregated users rows using SQL aggregation`)
      return convertAggregatedUsersToChartData(aggregatedData)
    }
    
    return []
  } catch (error) {
    // Fallback to old method if SQL aggregation fails (e.g., function doesn't exist yet)
    console.warn('SQL aggregation failed, falling back to row fetching:', error)
    return fetchRawUsersTimeSeriesDataFromDesktopCloudLegacy(accountId, granularity, filters, supabase)
  }
}

/**
 * Get available product names from raw tables for an account
 */
export async function getAvailableProducts(
  accountId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  // Get distinct products from desktop table
  const { data: desktopProducts } = await supabase
    .from('daily_user_desktop_raw')
    .select('product_name')
    .eq('account_id', accountId)
    .not('product_name', 'is', null)

  // Get distinct products from cloud table
  const { data: cloudProducts } = await supabase
    .from('daily_user_cloud_raw')
    .select('product_name')
    .eq('account_id', accountId)
    .not('product_name', 'is', null)

  // Combine and deduplicate
  const productSet = new Set<string>()
  desktopProducts?.forEach((row) => {
    if (row.product_name) {
      productSet.add(row.product_name)
    }
  })
  cloudProducts?.forEach((row) => {
    if (row.product_name) {
      productSet.add(row.product_name)
    }
  })

  // Return sorted list
  return Array.from(productSet).sort()
}

/**
 * Get available product names from desktop table only (for hours data)
 * Hours data only exists in daily_user_desktop_raw, not in cloud
 * Only returns products that actually have hours data (usage_hours IS NOT NULL)
 */
export async function getAvailableProductsForDesktop(
  accountId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  // Get distinct products from desktop table that have hours data
  const { data: desktopProducts } = await supabase
    .from('daily_user_desktop_raw')
    .select('product_name')
    .eq('account_id', accountId)
    .not('product_name', 'is', null)
    .not('usage_hours', 'is', null)

  const desktopProductNames = desktopProducts?.map(r => r.product_name).filter(Boolean) || []
  const uniqueDesktopProducts = Array.from(new Set(desktopProductNames)).sort()

  // Return unique sorted list
  return uniqueDesktopProducts
}

/**
 * Get available product names from acc_bim360_raw table for an account
 * Used for user-based charts (Users by Platform)
 */
export async function getAvailableProductsForEvents(
  accountId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: products } = await supabase
    .from('acc_bim360_raw')
    .select('product_name')
    .eq('account_id', accountId)
    .not('product_name', 'is', null)

  const productSet = new Set<string>()
  products?.forEach((row) => {
    if (row.product_name) {
      productSet.add(row.product_name)
    }
  })

  return Array.from(productSet).sort()
}

/**
 * Get date range (min and max dates) from acc_bim360_raw table for an account
 * Used for user-based charts (Users by Platform)
 */
export async function getDateRangeForEvents(
  accountId: string,
  supabase: SupabaseClient
): Promise<{ minDate: string | null; maxDate: string | null }> {
  const { data: minDateData } = await supabase
    .from('acc_bim360_raw')
    .select('event_date')
    .eq('account_id', accountId)
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: maxDateData } = await supabase
    .from('acc_bim360_raw')
    .select('event_date')
    .eq('account_id', accountId)
    .not('event_date', 'is', null)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    minDate: minDateData?.event_date || null,
    maxDate: maxDateData?.event_date || null,
  }
}

export interface EventsChartFilters {
  startDate?: string | null
  endDate?: string | null
  productNames: string[]
}

/**
 * Aggregate unique users time series data by granularity
 * Groups by period and product, counting unique user emails per combination
 */
function aggregateUsersTimeSeriesData(
  data: Array<{ event_date: string; product_name: string; user_email: string }>,
  granularity: TimeGranularity
): ChartDataPoint[] {
  // Map<periodKey, Map<productName, Set<user_email>>>
  const grouped = new Map<string, Map<string, Set<string>>>()

  data.forEach((row) => {
    if (!row.event_date || !row.user_email) return

    const date = new Date(row.event_date)
    let periodKey: string

    switch (granularity) {
      case 'week':
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
        periodKey = row.event_date
    }

    const productName = row.product_name || 'unknown'
    if (!grouped.has(periodKey)) {
      grouped.set(periodKey, new Map())
    }
    const periodData = grouped.get(periodKey)!
    if (!periodData.has(productName)) {
      periodData.set(productName, new Set<string>())
    }
    // Add user email to the set (Set automatically handles uniqueness)
    periodData.get(productName)!.add(row.user_email)
  })

  // Convert to chart data format
  const result: ChartDataPoint[] = []
  const sortedPeriods = Array.from(grouped.keys()).sort()

  sortedPeriods.forEach((period) => {
    const periodData = grouped.get(period)!
    const dataPoint: ChartDataPoint = { date: period }

    periodData.forEach((userSet, productName) => {
      // Count unique users (size of the Set)
      dataPoint[productName] = userSet.size
    })

    result.push(dataPoint)
  })

  return result
}

/**
 * Fetch time-series data for unique users from acc_bim360_raw table
 * Uses pagination to handle large datasets
 * Returns counts of unique users per period/product combination
 */
export async function fetchRawUsersTimeSeriesData(
  accountId: string,
  granularity: TimeGranularity,
  filters: EventsChartFilters,
  supabase: SupabaseClient
): Promise<ChartDataPoint[]> {
  // Build query function for pagination
  const buildQuery = () => {
    let query = supabase
      .from('acc_bim360_raw')
      .select('event_date, product_name, user_email', { count: 'exact' })
      .eq('account_id', accountId)
      .not('event_date', 'is', null)
      .not('product_name', 'is', null)
      .not('user_email', 'is', null)
      .order('event_date', { ascending: true })

    // Add date range filters
    if (filters.startDate) {
      query = query.gte('event_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('event_date', filters.endDate)
    }

    // Add product filter
    if (filters.productNames.length > 0) {
      query = query.in('product_name', filters.productNames)
    }

    return query
  }

  // Fetch all rows with pagination
  const allData = await fetchAllRows<{ event_date: string; product_name: string; user_email: string }>(
    supabase,
    'acc_bim360_raw',
    buildQuery
  )

  // Aggregate by granularity (counting unique users)
  return aggregateUsersTimeSeriesData(allData, granularity)
}

/**
 * Get date range (min and max dates) from raw tables for an account
 * Used to set default date picker constraints and validation
 */
export async function getDateRangeForAccount(
  accountId: string,
  supabase: SupabaseClient
): Promise<{ minDate: string | null; maxDate: string | null }> {
  // Get min/max dates from desktop table
  const { data: desktopMin } = await supabase
    .from('daily_user_desktop_raw')
    .select('usage_date')
    .eq('account_id', accountId)
    .not('usage_date', 'is', null)
    .not('tokens_consumed', 'is', null)
    .order('usage_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: desktopMax } = await supabase
    .from('daily_user_desktop_raw')
    .select('usage_date')
    .eq('account_id', accountId)
    .not('usage_date', 'is', null)
    .not('tokens_consumed', 'is', null)
    .order('usage_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get min/max dates from cloud table
  const { data: cloudMin } = await supabase
    .from('daily_user_cloud_raw')
    .select('usage_date')
    .eq('account_id', accountId)
    .not('usage_date', 'is', null)
    .not('tokens_consumed', 'is', null)
    .order('usage_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: cloudMax } = await supabase
    .from('daily_user_cloud_raw')
    .select('usage_date')
    .eq('account_id', accountId)
    .not('usage_date', 'is', null)
    .not('tokens_consumed', 'is', null)
    .order('usage_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Find overall min and max across both tables
  const dates: string[] = []
  if (desktopMin?.usage_date) dates.push(desktopMin.usage_date)
  if (desktopMax?.usage_date) dates.push(desktopMax.usage_date)
  if (cloudMin?.usage_date) dates.push(cloudMin.usage_date)
  if (cloudMax?.usage_date) dates.push(cloudMax.usage_date)

  if (dates.length === 0) {
    return { minDate: null, maxDate: null }
  }

  const sortedDates = dates.sort()
  return {
    minDate: sortedDates[0] || null,
    maxDate: sortedDates[sortedDates.length - 1] || null,
  }
}

/**
 * Get date range (min and max dates) from desktop table for hours data
 * Hours data only exists in daily_user_desktop_raw, not in cloud
 * Only considers rows with usage_hours IS NOT NULL
 */
export async function getDateRangeForHours(
  accountId: string,
  supabase: SupabaseClient
): Promise<{ minDate: string | null; maxDate: string | null }> {
  // Get min/max dates from desktop table where hours data exists
  const { data: desktopMin } = await supabase
    .from('daily_user_desktop_raw')
    .select('usage_date')
    .eq('account_id', accountId)
    .not('usage_date', 'is', null)
    .not('usage_hours', 'is', null)
    .order('usage_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: desktopMax } = await supabase
    .from('daily_user_desktop_raw')
    .select('usage_date')
    .eq('account_id', accountId)
    .not('usage_date', 'is', null)
    .not('usage_hours', 'is', null)
    .order('usage_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    minDate: desktopMin?.usage_date || null,
    maxDate: desktopMax?.usage_date || null,
  }
}
