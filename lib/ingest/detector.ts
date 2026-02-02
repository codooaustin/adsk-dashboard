import { parseFile } from './parser'
import { DatasetTypeDetectionError } from './errors'

export type DatasetType =
  | 'acc_bim360'
  | 'daily_user_cloud'
  | 'daily_user_desktop'
  | 'manual_adjustments'

/**
 * Detect dataset type based on header signatures
 */
export async function detectDatasetType(
  buffer: Buffer,
  filename: string
): Promise<{ type: DatasetType; headers: string[] } | null> {
  try {
    const { headers } = await parseFile(buffer, filename)
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

    // Check for acc_bim360: Event Date, User Email, Project Name, Product / Sub Product
    if (
      hasHeader(normalizedHeaders, 'event date') &&
      hasHeader(normalizedHeaders, 'user email') &&
      hasHeader(normalizedHeaders, 'project name') &&
      (hasHeader(normalizedHeaders, 'product / sub product') ||
        hasHeader(normalizedHeaders, 'product/sub product') ||
        hasHeader(normalizedHeaders, 'product'))
    ) {
      return { type: 'acc_bim360', headers }
    }

    // Check for daily_user_desktop FIRST (it's a superset of cloud)
    // Desktop has: usageDate, productName, userName, tokensConsumed, usageHours, useCount
    // OR has "Previous Version" which is unique to desktop
    if (
      hasHeader(normalizedHeaders, 'usagedate') &&
      hasHeader(normalizedHeaders, 'productname') &&
      hasHeader(normalizedHeaders, 'username') &&
      hasHeader(normalizedHeaders, 'tokensconsumed') &&
      (hasHeader(normalizedHeaders, 'usagehours') ||
        hasHeader(normalizedHeaders, 'usecount') ||
        hasHeader(normalizedHeaders, 'previous version'))
    ) {
      return { type: 'daily_user_desktop', headers }
    }

    // Check for daily_user_cloud: usageDate, productName, userName, tokensConsumed
    // (but NOT desktop - doesn't have usageHours, useCount, or Previous Version)
    if (
      hasHeader(normalizedHeaders, 'usagedate') &&
      hasHeader(normalizedHeaders, 'productname') &&
      hasHeader(normalizedHeaders, 'username') &&
      hasHeader(normalizedHeaders, 'tokensconsumed') &&
      !hasHeader(normalizedHeaders, 'usagehours') &&
      !hasHeader(normalizedHeaders, 'usecount') &&
      !hasHeader(normalizedHeaders, 'previous version')
    ) {
      return { type: 'daily_user_cloud', headers }
    }

    // Check for manual_adjustments: usageDate, transactionDate, reasonType, productName, tokensConsumed
    if (
      hasHeader(normalizedHeaders, 'usagedate') &&
      hasHeader(normalizedHeaders, 'transactiondate') &&
      hasHeader(normalizedHeaders, 'reasontype') &&
      hasHeader(normalizedHeaders, 'productname') &&
      hasHeader(normalizedHeaders, 'tokensconsumed')
    ) {
      return { type: 'manual_adjustments', headers }
    }

    return null
  } catch (error) {
    throw new DatasetTypeDetectionError(
      `Failed to detect dataset type: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Check if header array contains a header (case-insensitive, handles variations)
 */
function hasHeader(headers: string[], searchHeader: string): boolean {
  const normalized = searchHeader.toLowerCase().trim()
  return headers.some((h) => h.toLowerCase().trim() === normalized)
}
