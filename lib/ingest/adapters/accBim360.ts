import { SupabaseClient } from '@supabase/supabase-js'
import { IngestionAdapter, UsageFact, AccBim360RawRow, parseDate, formatDate, getRowValue, toNumber } from './base'
import { normalizeProductName, normalizeUserKey, normalizeProjectKey } from '../normalize'
import { ValidationError } from '../errors'

export class AccBim360Adapter implements IngestionAdapter {
  validateHeaders(headers: string[]): boolean {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    return (
      normalized.includes('event date') &&
      normalized.includes('user email') &&
      normalized.includes('project name') &&
      (normalized.includes('product / sub product') ||
        normalized.includes('product/sub product') ||
        normalized.includes('product'))
    )
  }

  async normalizeRow(
    row: Record<string, any>,
    accountId: string,
    datasetId: string,
    supabase: SupabaseClient
  ): Promise<UsageFact | null> {
    // Extract required fields (event-based format)
    const eventDate = getRowValue(row, 'Event Date')
    const userEmail = getRowValue(row, 'User Email')
    const productName = getRowValue(row, 'Product / Sub Product') ||
      getRowValue(row, 'Product/Sub Product') ||
      getRowValue(row, 'Product')
    const projectName = getRowValue(row, 'Project Name')

    // Validate required fields
    if (!eventDate || !userEmail || !productName) {
      return null // Skip invalid rows
    }

    // Parse date
    const dateObj = parseDate(eventDate)
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
    const userKey = normalizeUserKey(userEmail)

    // Normalize project key
    const projectKey = normalizeProjectKey(projectName)

    // Extract additional fields for dimensions
    const dimensions: Record<string, any> = {}
    
    // Add any additional fields that might be present
    const featureCategory = getRowValue(row, 'Feature Category')
    if (featureCategory) dimensions.featureCategory = featureCategory

    const projectId = getRowValue(row, 'Project ID')
    if (projectId) dimensions.projectId = projectId

    // Copy any custom fields
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['event date', 'user email', 'product / sub product', 'product/sub product', 'product', 'project name'].includes(lowerKey) &&
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
      dataset_type: 'acc_bim360',
      product_key: productKey,
      user_key: userKey,
      project_key: projectKey,
      metric_tokens: null, // Event-based, no tokens
      metric_events: 1, // Each row is an event
      usage_hours: null,
      use_count: null,
      dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
    }
  }

  transformToRaw(
    row: Record<string, any>,
    accountId: string,
    datasetId: string
  ): AccBim360RawRow | null {
    // Extract required fields
    const eventDate = getRowValue(row, 'Event Date')
    const userEmail = getRowValue(row, 'User Email')
    const productName = getRowValue(row, 'Product / Sub Product') ||
      getRowValue(row, 'Product/Sub Product') ||
      getRowValue(row, 'Product')
    const projectName = getRowValue(row, 'Project Name')

    // Validate required fields and track what's missing
    const missingFields: string[] = []
    if (!eventDate) missingFields.push('Event Date')
    if (!userEmail) missingFields.push('User Email')
    if (!productName) missingFields.push('Product / Sub Product (or Product)')
    
    if (missingFields.length > 0) {
      // Throw error with reason so orchestrator can catch it
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Parse date
    const dateObj = parseDate(eventDate)
    if (!dateObj) {
      throw new Error(`Invalid date value: ${JSON.stringify(eventDate)} (type: ${typeof eventDate})`)
    }
    const date = formatDate(dateObj)
    if (!date) {
      throw new Error(`Failed to format date: ${JSON.stringify(eventDate)} -> ${dateObj?.toString()}`)
    }

    // Extract structured fields
    const featureCategory = getRowValue(row, 'Feature Category')
    const projectId = getRowValue(row, 'Project ID')

    // Store all other fields in raw_data
    const rawData: Record<string, any> = {}
    Object.keys(row).forEach((key) => {
      const lowerKey = key.toLowerCase().trim()
      if (
        !['event date', 'user email', 'product / sub product', 'product/sub product', 'product', 'project name', 'feature category', 'project id'].includes(lowerKey) &&
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
      event_date: date,
      user_email: userEmail,
      project_name: projectName || null,
      product_name: productName,
      feature_category: featureCategory || null,
      project_id: projectId || null,
      raw_data: Object.keys(rawData).length > 0 ? rawData : null,
    }
  }
}
