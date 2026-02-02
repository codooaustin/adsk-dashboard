import { SupabaseClient } from '@supabase/supabase-js'
import { IngestionAdapter, UsageFact, DailyUserDesktopRawRow, parseDate, formatDate, getRowValue, toNumber } from './base'
import { normalizeProductName, normalizeUserKey } from '../normalize'

export class DailyUserDesktopAdapter implements IngestionAdapter {
  validateHeaders(headers: string[]): boolean {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    return (
      normalized.includes('usagedate') &&
      normalized.includes('productname') &&
      normalized.includes('username') &&
      normalized.includes('tokensconsumed') &&
      normalized.includes('usagehours') &&
      normalized.includes('usecount')
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
    const usageHours = getRowValue(row, 'usageHours')
    const useCount = getRowValue(row, 'useCount')

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

    // Extract metrics
    const metricTokens = toNumber(tokensConsumed)
    const metricUsageHours = toNumber(usageHours)
    const metricUseCount = toNumber(useCount)

    // Extract additional fields for dimensions
    const dimensions: Record<string, any> = {}
    
    const productVersion = getRowValue(row, 'productVersion')
    if (productVersion) dimensions.productVersion = productVersion

    const machineName = getRowValue(row, 'machineName')
    if (machineName) dimensions.machineName = machineName

    const licenseServerName = getRowValue(row, 'licenseServerName')
    if (licenseServerName) dimensions.licenseServerName = licenseServerName

    // Copy any other custom fields
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['usagedate', 'productname', 'username', 'tokensconsumed', 'usagehours', 'usecount', 'productversion', 'machinename', 'licenseservername'].includes(lowerKey) &&
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
      dataset_type: 'daily_user_desktop',
      product_key: productKey,
      user_key: userKey,
      project_key: null, // No project context in desktop data
      metric_tokens: metricTokens,
      metric_events: null, // Consumption data, not event-based
      usage_hours: metricUsageHours,
      use_count: metricUseCount,
      dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
    }
  }

  transformToRaw(
    row: Record<string, any>,
    accountId: string,
    datasetId: string
  ): DailyUserDesktopRawRow | null {
    // Extract required fields
    const usageDate = getRowValue(row, 'usageDate')
    const productName = getRowValue(row, 'productName')
    const userName = getRowValue(row, 'userName')
    const tokensConsumed = getRowValue(row, 'tokensConsumed')
    const usageHours = getRowValue(row, 'usageHours')
    const useCount = getRowValue(row, 'useCount')

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

    // Extract metrics
    const tokens = toNumber(tokensConsumed)
    const hours = toNumber(usageHours)
    const count = toNumber(useCount)

    // Extract structured fields
    const productVersion = getRowValue(row, 'productVersion')
    const machineName = getRowValue(row, 'machineName')
    const licenseServerName = getRowValue(row, 'licenseServerName')

    // Store all other fields in raw_data
    const rawData: Record<string, any> = {}
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['usagedate', 'productname', 'username', 'tokensconsumed', 'usagehours', 'usecount', 'productversion', 'machinename', 'licenseservername'].includes(lowerKey) &&
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
      product_version: productVersion || null,
      user_name: userName,
      machine_name: machineName || null,
      license_server_name: licenseServerName || null,
      tokens_consumed: tokens,
      usage_hours: hours,
      use_count: count,
      raw_data: Object.keys(rawData).length > 0 ? rawData : null,
    }
  }
}
