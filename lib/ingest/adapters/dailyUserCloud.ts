import { SupabaseClient } from '@supabase/supabase-js'
import { IngestionAdapter, UsageFact, DailyUserCloudRawRow, parseDate, formatDate, getRowValue, toNumber } from './base'
import { normalizeProductName, normalizeUserKey } from '../normalize'

export class DailyUserCloudAdapter implements IngestionAdapter {
  validateHeaders(headers: string[]): boolean {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    return (
      normalized.includes('usagedate') &&
      normalized.includes('productname') &&
      normalized.includes('username') &&
      normalized.includes('tokensconsumed')
    )
  }

  async normalizeRow(
    row: Record<string, any>,
    accountId: string,
    datasetId: string,
    supabase: SupabaseClient
  ): Promise<UsageFact | null> {
    // Extract required fields
    const usageDate = getRowValue(row, 'usageDate')
    const productName = getRowValue(row, 'productName')
    const userName = getRowValue(row, 'userName')
    const tokensConsumed = getRowValue(row, 'tokensConsumed')

    // Validate required fields
    if (!usageDate || !productName || !userName) {
      return null // Skip invalid rows
    }

    // Parse date
    const dateObj = parseDate(usageDate)
    if (!dateObj) {
      return null // Skip rows with invalid dates
    }
    const date = formatDate(dateObj)
    if (!date) {
      return null
    }

    // Normalize product name
    const productKey = await normalizeProductName(productName, supabase)

    // Normalize user key
    const userKey = normalizeUserKey(userName)

    // Extract tokens
    const metricTokens = toNumber(tokensConsumed)

    // Extract additional fields for dimensions
    const dimensions: Record<string, any> = {}
    
    // Copy any custom fields
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['usagedate', 'productname', 'username', 'tokensconsumed'].includes(lowerKey) &&
        row[key] !== null &&
        row[key] !== undefined &&
        row[key] !== ''
      ) {
        dimensions[key] = row[key]
      }
    })

    return {
      account_id: accountId,
      dataset_id: datasetId,
      date,
      dataset_type: 'daily_user_cloud',
      product_key: productKey,
      user_key: userKey,
      project_key: null, // No project context in cloud data
      metric_tokens: metricTokens,
      metric_events: null, // Consumption data, not event-based
      usage_hours: null,
      use_count: null,
      dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
    }
  }

  transformToRaw(
    row: Record<string, any>,
    accountId: string,
    datasetId: string
  ): DailyUserCloudRawRow | null {
    // Extract required fields
    const usageDate = getRowValue(row, 'usageDate')
    const productName = getRowValue(row, 'productName')
    const userName = getRowValue(row, 'userName')
    const tokensConsumed = getRowValue(row, 'tokensConsumed')

    // Validate required fields
    if (!usageDate || !productName || !userName) {
      return null // Skip invalid rows
    }

    // Parse date
    const dateObj = parseDate(usageDate)
    if (!dateObj) {
      return null // Skip rows with invalid dates
    }
    const date = formatDate(dateObj)
    if (!date) {
      return null
    }

    // Extract tokens
    const tokens = toNumber(tokensConsumed)

    // Store all other fields in raw_data
    const rawData: Record<string, any> = {}
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['usagedate', 'productname', 'username', 'tokensconsumed'].includes(lowerKey) &&
        row[key] !== null &&
        row[key] !== undefined &&
        row[key] !== ''
      ) {
        rawData[key] = row[key]
      }
    })

    return {
      dataset_id: datasetId,
      account_id: accountId,
      usage_date: date,
      product_name: productName,
      user_name: userName,
      tokens_consumed: tokens,
      raw_data: Object.keys(rawData).length > 0 ? rawData : null,
    }
  }
}
