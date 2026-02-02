import { SupabaseClient } from '@supabase/supabase-js'
import { IngestionAdapter, UsageFact, ManualAdjustmentsRawRow, parseDate, formatDate, getRowValue, toNumber } from './base'
import { normalizeProductName } from '../normalize'

export class ManualAdjustmentsAdapter implements IngestionAdapter {
  validateHeaders(headers: string[]): boolean {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    return (
      normalized.includes('usagedate') &&
      normalized.includes('transactiondate') &&
      normalized.includes('reasontype') &&
      normalized.includes('productname') &&
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
    const transactionDate = getRowValue(row, 'transactionDate')
    const reasonType = getRowValue(row, 'reasonType')
    const productName = getRowValue(row, 'productName')
    const tokensConsumed = getRowValue(row, 'tokensConsumed')

    // Validate required fields
    if (!usageDate || !productName) {
      return null // Skip invalid rows
    }

    // Parse date (use usageDate as primary date)
    const dateObj = parseDate(usageDate)
    if (!dateObj) {
      return null // Skip rows with invalid dates
    }
    const date = formatDate(dateObj)
    if (!date) {
      return null
    }

    // Normalize product name (handle "N/A" case)
    let productKey: string
    if (productName && productName.toString().toLowerCase().trim() !== 'n/a') {
      productKey = await normalizeProductName(productName, supabase)
    } else {
      productKey = 'n/a'
    }

    // For manual adjustments, user_key can be null or a generic value
    // Since there's no user in manual adjustments, use a placeholder
    const userKey = 'system'

    // Extract tokens
    const metricTokens = toNumber(tokensConsumed)

    // Extract additional fields for dimensions
    const dimensions: Record<string, any> = {}
    
    if (transactionDate) {
      const transDate = parseDate(transactionDate)
      if (transDate) {
        dimensions.transactionDate = formatDate(transDate)
      }
    }

    if (reasonType) dimensions.reasonType = reasonType

    const reasonComment = getRowValue(row, 'reasonComment')
    if (reasonComment) dimensions.reasonComment = reasonComment

    const usageCategory = getRowValue(row, 'usageCategory')
    if (usageCategory) dimensions.usageCategory = usageCategory

    const chargedItemID = getRowValue(row, 'chargedItemID')
    if (chargedItemID) dimensions.chargedItemID = chargedItemID

    const quantity = getRowValue(row, 'quantity')
    if (quantity !== null && quantity !== undefined) {
      dimensions.quantity = toNumber(quantity)
    }

    // Copy any other custom fields
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['usagedate', 'transactiondate', 'reasontype', 'productname', 'tokensconsumed', 'reasoncomment', 'usagecategory', 'chargeditemid', 'quantity'].includes(lowerKey) &&
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
      dataset_type: 'manual_adjustments',
      product_key: productKey,
      user_key: userKey,
      project_key: null, // No project context in manual adjustments
      metric_tokens: metricTokens,
      metric_events: null, // Adjustment data, not event-based
      usage_hours: null,
      use_count: null,
      dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
    }
  }

  transformToRaw(
    row: Record<string, any>,
    accountId: string,
    datasetId: string
  ): ManualAdjustmentsRawRow | null {
    // Extract required fields
    const usageDate = getRowValue(row, 'usageDate')
    const transactionDate = getRowValue(row, 'transactionDate')
    const reasonType = getRowValue(row, 'reasonType')
    const productName = getRowValue(row, 'productName')
    const tokensConsumed = getRowValue(row, 'tokensConsumed')

    // Validate required fields
    if (!usageDate) {
      return null // Skip invalid rows
    }

    // Parse dates
    const usageDateObj = parseDate(usageDate)
    if (!usageDateObj) {
      return null // Skip rows with invalid dates
    }
    const usageDateStr = formatDate(usageDateObj)
    if (!usageDateStr) {
      return null
    }

    let transactionDateStr: string | null = null
    if (transactionDate) {
      const transDateObj = parseDate(transactionDate)
      if (transDateObj) {
        transactionDateStr = formatDate(transDateObj)
      }
    }

    // Extract tokens
    const tokens = toNumber(tokensConsumed)

    // Extract structured fields
    const reasonComment = getRowValue(row, 'reasonComment')

    // Store all other fields in raw_data
    const rawData: Record<string, any> = {}
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['usagedate', 'transactiondate', 'reasontype', 'productname', 'tokensconsumed', 'reasoncomment'].includes(lowerKey) &&
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
      usage_date: usageDateStr,
      transaction_date: transactionDateStr,
      reason_type: reasonType || null,
      product_name: productName || null,
      reason_comment: reasonComment || null,
      tokens_consumed: tokens,
      raw_data: Object.keys(rawData).length > 0 ? rawData : null,
    }
  }
}
