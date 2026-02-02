import { SupabaseClient } from '@supabase/supabase-js'
import { isValid, parseISO } from 'date-fns'

export interface UsageFact {
  account_id: string
  dataset_id: string
  date: string // ISO date string (YYYY-MM-DD)
  dataset_type: string
  product_key: string
  user_key: string
  project_key: string | null
  metric_tokens: number | null
  metric_events: number | null
  usage_hours: number | null
  use_count: number | null
  dimensions: Record<string, any> | null
}

// Raw table row interfaces
export interface AccBim360RawRow {
  dataset_id: string
  account_id: string
  event_date: string // ISO date string (YYYY-MM-DD)
  user_email: string
  project_name: string | null
  product_name: string
  feature_category: string | null
  project_id: string | null
  raw_data: Record<string, any> | null
}

export interface DailyUserCloudRawRow {
  dataset_id: string
  account_id: string
  usage_date: string // ISO date string (YYYY-MM-DD)
  product_name: string
  user_name: string
  tokens_consumed: number | null
  raw_data: Record<string, any> | null
}

export interface DailyUserDesktopRawRow {
  dataset_id: string
  account_id: string
  usage_date: string // ISO date string (YYYY-MM-DD)
  product_name: string
  product_version: string | null
  user_name: string
  machine_name: string | null
  license_server_name: string | null
  tokens_consumed: number | null
  usage_hours: number | null
  use_count: number | null
  raw_data: Record<string, any> | null
}

export interface ManualAdjustmentsRawRow {
  dataset_id: string
  account_id: string
  usage_date: string // ISO date string (YYYY-MM-DD)
  transaction_date: string | null
  reason_type: string | null
  product_name: string | null
  reason_comment: string | null
  tokens_consumed: number | null
  raw_data: Record<string, any> | null
}

export type RawTableRow =
  | AccBim360RawRow
  | DailyUserCloudRawRow
  | DailyUserDesktopRawRow
  | ManualAdjustmentsRawRow

export interface IngestionAdapter {
  // Legacy method for normalized output (deprecated, kept for backward compatibility)
  normalizeRow(
    row: Record<string, any>,
    accountId: string,
    datasetId: string,
    supabase: SupabaseClient
  ): Promise<UsageFact | null>
  
  // New method for raw table output (preferred)
  transformToRaw(
    row: Record<string, any>,
    accountId: string,
    datasetId: string
  ): RawTableRow | null
  
  validateHeaders(headers: string[]): boolean
}

/**
 * Parse date from various formats
 * Handles Excel serial dates, ISO strings, and common date formats
 */
export function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null

  // If already a Date object
  if (dateValue instanceof Date) {
    if (isValid(dateValue) && !isNaN(dateValue.getTime())) {
      // Validate date is in reasonable range (1900-2100)
      const year = dateValue.getFullYear()
      if (year >= 1900 && year <= 2100) {
        return dateValue
      }
    }
    return null
  }

  // If it's a number, could be Excel serial date or timestamp
  if (typeof dateValue === 'number') {
    // Excel serial dates start from 1900-01-01 (serial 1)
    // Common range: 1 to ~50000 (covers 1900-2100)
    if (dateValue > 0 && dateValue < 1000000) {
      // Try as Excel serial date (days since 1900-01-01)
      // Excel epoch is 1899-12-30 (serial 0 = 1899-12-30)
      const excelEpoch = new Date(1899, 11, 30) // Month is 0-indexed
      const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000)
      if (isValid(date) && !isNaN(date.getTime())) {
        const year = date.getFullYear()
        if (year >= 1900 && year <= 2100) {
          return date
        }
      }
    }
    
    // Try as regular timestamp
    const date = new Date(dateValue)
    if (isValid(date) && !isNaN(date.getTime())) {
      const year = date.getFullYear()
      if (year >= 1900 && year <= 2100) {
        return date
      }
    }
    return null
  }

  // If it's a string, try common formats
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim()
    if (!trimmed) return null

    // Reject obviously invalid strings (like "+046022-01-01")
    if (trimmed.length > 50 || /^[+\-]?\d{6,}/.test(trimmed)) {
      return null
    }

    // Try ISO format first (YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
    // Handle formats like "2024-04-30 00:00:00" or "2024-04-30T00:00:00"
    const isoLike = trimmed.replace(' ', 'T').replace(/\.\d{3}/, '')
    try {
      const isoDate = parseISO(isoLike)
      if (isValid(isoDate) && !isNaN(isoDate.getTime())) {
        const year = isoDate.getFullYear()
        if (year >= 1900 && year <= 2100) {
          return isoDate
        }
      }
    } catch {
      // Continue to other formats
    }

    // Try native Date parsing as fallback (handles many formats)
    const nativeDate = new Date(trimmed)
    if (isValid(nativeDate) && !isNaN(nativeDate.getTime())) {
      const year = nativeDate.getFullYear()
      if (year >= 1900 && year <= 2100) {
        return nativeDate
      }
    }
  }

  return null
}

/**
 * Format date to YYYY-MM-DD string
 * Validates the date is in a reasonable range before formatting
 */
export function formatDate(date: Date | null): string | null {
  if (!date || !isValid(date) || isNaN(date.getTime())) return null
  
  // Validate date is in reasonable range (1900-2100)
  const year = date.getFullYear()
  if (year < 1900 || year > 2100) {
    return null
  }

  try {
    const isoString = date.toISOString()
    const datePart = isoString.split('T')[0]
    
    // Validate the format is YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return null
    }
    
    return datePart
  } catch {
    return null
  }
}

/**
 * Get value from row with case-insensitive key matching
 */
export function getRowValue(row: Record<string, any>, key: string): any {
  const normalizedKey = key.toLowerCase().trim()
  const rowKey = Object.keys(row).find(
    (k) => k.toLowerCase().trim() === normalizedKey
  )
  return rowKey ? row[rowKey] : null
}

/**
 * Convert value to number, handling null/empty strings
 */
export function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return isNaN(num) ? null : num
}
