import { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from './rawChartData'

export interface KPIData {
  activeUsers: number // Daily average
  totalTokens: number
  projectsActive: number
  eventsCount: number
  powerUsersPercent: number // Top 10% share
}

type RawRow = {
  usage_date: string | null
  user_name: string | null
  tokens_consumed: number | null
}

/**
 * Fetch KPI data for an account.
 * Uses a single fetch per raw table (desktop, cloud) with all columns needed for KPIs.
 */
export async function fetchKPIData(
  accountId: string,
  supabase: SupabaseClient
): Promise<KPIData> {
  const [desktopRows, cloudRows] = await Promise.all([
    fetchAllRows<RawRow>(supabase, 'daily_user_desktop_raw', () =>
      supabase
        .from('daily_user_desktop_raw')
        .select('usage_date, user_name, tokens_consumed')
        .eq('account_id', accountId)
        .not('user_name', 'is', null)
    ),
    fetchAllRows<RawRow>(supabase, 'daily_user_cloud_raw', () =>
      supabase
        .from('daily_user_cloud_raw')
        .select('usage_date, user_name, tokens_consumed')
        .eq('account_id', accountId)
        .not('user_name', 'is', null)
    ),
  ])

  const userDateSet = new Set<string>()
  const uniqueDates = new Set<string>()
  let totalTokens = 0
  const userTokenMap = new Map<string, number>()

  function process(row: RawRow) {
    if (row.usage_date) uniqueDates.add(row.usage_date)
    if (row.user_name && row.usage_date) {
      userDateSet.add(`${row.user_name}|${row.usage_date}`)
    }
    if (row.user_name && row.tokens_consumed != null) {
      const n = Number(row.tokens_consumed) || 0
      totalTokens += n
      userTokenMap.set(row.user_name, (userTokenMap.get(row.user_name) || 0) + n)
    }
  }

  desktopRows.forEach(process)
  cloudRows.forEach(process)

  const usersPerDay = new Map<string, Set<string>>()
  userDateSet.forEach((key) => {
    const [user, date] = key.split('|')
    if (!usersPerDay.has(date)) usersPerDay.set(date, new Set())
    usersPerDay.get(date)!.add(user)
  })
  const totalDays = uniqueDates.size || 1
  const totalUserDays = Array.from(usersPerDay.values()).reduce((s, u) => s + u.size, 0)
  const activeUsers = totalDays > 0 ? totalUserDays / totalDays : 0

  const sortedUsers = Array.from(userTokenMap.entries())
    .map(([user, tokens]) => ({ user, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
  const top10Count = Math.max(1, Math.ceil(sortedUsers.length * 0.1))
  const top10Tokens = sortedUsers.slice(0, top10Count).reduce((s, u) => s + u.tokens, 0)
  const powerUsersPercent = totalTokens > 0 ? (top10Tokens / totalTokens) * 100 : 0

  const projectRows = await fetchAllRows<{ project_name: string | null; project_id: string | null }>(
    supabase,
    'acc_bim360_raw',
    () =>
      supabase
        .from('acc_bim360_raw')
        .select('project_name, project_id')
        .eq('account_id', accountId)
  )
  const uniqueProjects = new Set<string>()
  projectRows.forEach((row) => {
    if (row.project_name) uniqueProjects.add(row.project_name)
    else if (row.project_id) uniqueProjects.add(row.project_id)
  })

  const { count } = await supabase
    .from('acc_bim360_raw')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
  const eventsCount = count ?? 0

  return {
    activeUsers: Math.round(activeUsers * 100) / 100,
    totalTokens,
    projectsActive: uniqueProjects.size,
    eventsCount,
    powerUsersPercent: Math.round(powerUsersPercent * 10) / 10,
  }
}
