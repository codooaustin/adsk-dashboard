import { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from './rawChartData'

export interface TopUserData {
  user_key: string // Normalized user identifier for display (email if available, otherwise user_name)
  tokens: number // Sum from desktop + cloud
  events: number // Count from acc_bim360
  usage_hours: number // Sum from desktop only
}

/**
 * Normalize username for matching - keeps dots in email username
 */
function normalizeUsername(emailOrName: string): string {
  // If it's an email, extract username part and keep dots (do NOT remove)
  if (emailOrName.includes('@')) {
    return emailOrName.split('@')[0].toLowerCase() // Keep dots in normalized form
  }
  // Otherwise, it's already a user_name (no dots), just lowercase
  return emailOrName.toLowerCase()
}

/**
 * Normalize username for fallback matching - removes dots
 */
function normalizeUsernameForMatching(emailOrName: string): string {
  const normalized = normalizeUsername(emailOrName)
  // Remove dots only for fallback matching if exact match fails
  return normalized.replace(/\./g, '')
}

/**
 * Find matching key in existing keys - tries exact match first, then fallback without dots
 */
function findMatchingKey(emailOrName: string, existingKeys: Set<string>): string | null {
  const normalized = normalizeUsername(emailOrName)
  
  // Try exact match first (with dots)
  if (existingKeys.has(normalized)) {
    return normalized
  }
  
  // Fallback: try without dots
  const withoutDots = normalizeUsernameForMatching(emailOrName)
  if (existingKeys.has(withoutDots)) {
    return withoutDots
  }
  
  // No match found
  return null
}

/**
 * Fetch and aggregate top users data from raw tables
 */
export async function fetchTopUsersData(
  accountId: string,
  limit: number,
  supabase: SupabaseClient
): Promise<TopUserData[]> {
  // Query all three tables in parallel with pagination
  const [desktopData, cloudData, eventsData] = await Promise.all([
    // Desktop: user_name, tokens_consumed, usage_hours
    fetchAllRows<{ user_name: string; tokens_consumed: number | null; usage_hours: number | null }>(
      supabase,
      'daily_user_desktop_raw',
      () =>
        supabase
          .from('daily_user_desktop_raw')
          .select('user_name, tokens_consumed, usage_hours')
          .eq('account_id', accountId)
          .not('user_name', 'is', null)
    ),
    // Cloud: user_name, tokens_consumed
    fetchAllRows<{ user_name: string; tokens_consumed: number | null }>(
      supabase,
      'daily_user_cloud_raw',
      () =>
        supabase
          .from('daily_user_cloud_raw')
          .select('user_name, tokens_consumed')
          .eq('account_id', accountId)
          .not('user_name', 'is', null)
    ),
    // Events: user_email (count rows per user)
    fetchAllRows<{ user_email: string }>(
      supabase,
      'acc_bim360_raw',
      () =>
        supabase
          .from('acc_bim360_raw')
          .select('user_email')
          .eq('account_id', accountId)
          .not('user_email', 'is', null)
    ),
  ])

  // Build aggregation map
  // Key: normalized username (for matching) - use user_name format (no dots) as base
  // Value: aggregated data + display key (email if available, otherwise user_name)
  const userMap = new Map<
    string,
    {
      displayKey: string // For display (email if available, otherwise user_name)
      tokens: number
      events: number
      usage_hours: number
    }
  >()

  // Process desktop data first (establishes base keys from user_name)
  desktopData.forEach((row) => {
    if (!row.user_name) return

    const key = normalizeUsername(row.user_name) // user_name has no dots, so this is just lowercase
    const existing = userMap.get(key) || {
      displayKey: row.user_name, // Start with user_name, may be replaced by email later
      tokens: 0,
      events: 0,
      usage_hours: 0,
    }

    existing.tokens += Number(row.tokens_consumed) || 0
    existing.usage_hours += Number(row.usage_hours) || 0

    userMap.set(key, existing)
  })

  // Process cloud data (matches against existing keys)
  cloudData.forEach((row) => {
    if (!row.user_name) return

    const key = normalizeUsername(row.user_name) // user_name has no dots
    const existing = userMap.get(key) || {
      displayKey: row.user_name,
      tokens: 0,
      events: 0,
      usage_hours: 0,
    }

    existing.tokens += Number(row.tokens_consumed) || 0

    userMap.set(key, existing)
  })

  // Process events data (acc_bim360) - need to match email to user_name
  eventsData.forEach((row) => {
    if (!row.user_email) return

    const existingKeys = new Set(userMap.keys())
    const matchingKey = findMatchingKey(row.user_email, existingKeys)
    
    if (matchingKey) {
      // Found matching user from desktop/cloud
      const existing = userMap.get(matchingKey)!
      existing.events += 1 // Count each row as 1 event
      // Update display key to email if we have it (prefer email over user_name)
      if (row.user_email.includes('@')) {
        existing.displayKey = row.user_email
      }
    } else {
      // New user only in events table
      const key = normalizeUsernameForMatching(row.user_email) // Remove dots for consistency
      const existing = userMap.get(key) || {
        displayKey: row.user_email, // Use email for display
        tokens: 0,
        events: 0,
        usage_hours: 0,
      }
      existing.events += 1
      userMap.set(key, existing)
    }
  })

  // Convert to array and sort by tokens (default), then limit
  const result: TopUserData[] = Array.from(userMap.entries()).map(([_, data]) => ({
    user_key: data.displayKey,
    tokens: data.tokens,
    events: data.events,
    usage_hours: data.usage_hours,
  }))

  // Sort by tokens descending (default sort for top users)
  result.sort((a, b) => b.tokens - a.tokens)

  // Return limited results
  return result.slice(0, limit)
}
