import { SupabaseClient } from '@supabase/supabase-js'
import { UsageFact } from './adapters/base'
import { loadProductAliasesMap, normalizeProductNameBatch, normalizeUserKey, normalizeProjectKey } from './normalize'
import { DatabaseError, ValidationError } from './errors'

const BATCH_SIZE = 1000

/**
 * Normalize raw dataset data into usage_facts table
 * Reads from raw tables, applies product alias normalization, and inserts into usage_facts
 */
export async function normalizeRawDataset(
  datasetId: string,
  accountId: string,
  datasetType: string,
  supabase: SupabaseClient
): Promise<{ rowsNormalized: number; rowsInserted: number }> {
  console.log(`Starting batch normalization for dataset ${datasetId} (type: ${datasetType})`)

  // Load product aliases once
  const aliasMap = await loadProductAliasesMap(supabase)

  let rowsNormalized = 0
  let rowsInserted = 0

  // Fetch raw data based on dataset type
  // Use pagination to fetch all rows (Supabase default limit is 1000)
  let rawRows: any[] = []
  let rawTableName: string
  const PAGE_SIZE = 10000 // Fetch in chunks of 10k

  switch (datasetType) {
    case 'acc_bim360':
      rawTableName = 'acc_bim360_raw'
      let accOffset = 0
      while (true) {
        const { data: accData, error: accError } = await supabase
          .from('acc_bim360_raw')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('account_id', accountId)
          .range(accOffset, accOffset + PAGE_SIZE - 1)

        if (accError) {
          throw new DatabaseError(`Failed to fetch raw data: ${accError.message}`)
        }
        if (!accData || accData.length === 0) break
        rawRows.push(...accData)
        if (accData.length < PAGE_SIZE) break
        accOffset += PAGE_SIZE
      }
      break

    case 'daily_user_cloud':
      rawTableName = 'daily_user_cloud_raw'
      let cloudOffset = 0
      while (true) {
        const { data: cloudData, error: cloudError } = await supabase
          .from('daily_user_cloud_raw')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('account_id', accountId)
          .range(cloudOffset, cloudOffset + PAGE_SIZE - 1)

        if (cloudError) {
          throw new DatabaseError(`Failed to fetch raw data: ${cloudError.message}`)
        }
        if (!cloudData || cloudData.length === 0) break
        rawRows.push(...cloudData)
        if (cloudData.length < PAGE_SIZE) break
        cloudOffset += PAGE_SIZE
      }
      break

    case 'daily_user_desktop':
      rawTableName = 'daily_user_desktop_raw'
      let desktopOffset = 0
      while (true) {
        const { data: desktopData, error: desktopError } = await supabase
          .from('daily_user_desktop_raw')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('account_id', accountId)
          .range(desktopOffset, desktopOffset + PAGE_SIZE - 1)

        if (desktopError) {
          throw new DatabaseError(`Failed to fetch raw data: ${desktopError.message}`)
        }
        if (!desktopData || desktopData.length === 0) break
        rawRows.push(...desktopData)
        if (desktopData.length < PAGE_SIZE) break
        desktopOffset += PAGE_SIZE
      }
      break

    case 'manual_adjustments':
      rawTableName = 'manual_adjustments_raw'
      let manualOffset = 0
      while (true) {
        const { data: manualData, error: manualError } = await supabase
          .from('manual_adjustments_raw')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('account_id', accountId)
          .range(manualOffset, manualOffset + PAGE_SIZE - 1)

        if (manualError) {
          throw new DatabaseError(`Failed to fetch raw data: ${manualError.message}`)
        }
        if (!manualData || manualData.length === 0) break
        rawRows.push(...manualData)
        if (manualData.length < PAGE_SIZE) break
        manualOffset += PAGE_SIZE
      }
      break

    default:
      throw new ValidationError(`Unknown dataset type: ${datasetType}`)
  }

  if (rawRows.length === 0) {
    throw new ValidationError(`No raw data found for dataset ${datasetId}`)
  }

  console.log(`Found ${rawRows.length} raw rows in memory to normalize`)

  // Calculate date range and row count from raw tables
  // Determine the date column name based on dataset type
  const dateColumn = datasetType === 'acc_bim360' ? 'event_date' : 'usage_date'
  
  // Use SQL aggregation to get min/max dates (avoids 1000 row limit issue)
  // Query min date
  const { data: minDateData, error: minDateError } = await supabase
    .from(rawTableName)
    .select(dateColumn)
    .eq('dataset_id', datasetId)
    .eq('account_id', accountId)
    .not(dateColumn, 'is', null)
    .order(dateColumn, { ascending: true })
    .limit(1)
    .maybeSingle()

  if (minDateError) {
    console.error(`Failed to get min date from ${rawTableName}:`, minDateError)
  }

  // Query max date
  const { data: maxDateData, error: maxDateError } = await supabase
    .from(rawTableName)
    .select(dateColumn)
    .eq('dataset_id', datasetId)
    .eq('account_id', accountId)
    .not(dateColumn, 'is', null)
    .order(dateColumn, { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxDateError) {
    console.error(`Failed to get max date from ${rawTableName}:`, maxDateError)
  }

  // Get count of all rows from database
  const { count: totalRowCount, error: countError } = await supabase
    .from(rawTableName)
    .select('*', { count: 'exact', head: true })
    .eq('dataset_id', datasetId)
    .eq('account_id', accountId)

  if (countError) {
    console.error('Failed to get row count:', countError)
  }

  // Log discrepancy if there is one (rawRows.length is from in-memory array, totalRowCount is from DB)
  if (totalRowCount !== null && totalRowCount !== rawRows.length) {
    console.warn(`Row count discrepancy for ${rawTableName}: in-memory=${rawRows.length}, database=${totalRowCount}`)
  }

  // Extract date strings directly (PostgreSQL DATE columns return as YYYY-MM-DD strings)
  let minDate: string | null = ((minDateData as Record<string, unknown>)?.[dateColumn] as string) ?? null
  let maxDate: string | null = ((maxDateData as Record<string, unknown>)?.[dateColumn] as string) ?? null

  // Log for debugging
  if (minDateError || maxDateError) {
    console.warn(`Date range query issues for ${rawTableName}:`, { minDateError, maxDateError })
  }
  
  // If we couldn't get dates from queries, try from rawRows as fallback
  if (!minDate || !maxDate) {
    console.warn(`Falling back to calculating dates from rawRows array for ${rawTableName}`)
    const datesFromRows = rawRows
      .map((r) => r[dateColumn])
      .filter((d): d is string => d !== null && d !== undefined && typeof d === 'string')
      .sort()
    
    if (datesFromRows.length > 0) {
      const fallbackMin = datesFromRows[0]
      const fallbackMax = datesFromRows[datesFromRows.length - 1]
      console.log(`Fallback dates: ${fallbackMin} to ${fallbackMax}`)
      // Only use fallback if we don't have query results
      if (!minDate) minDate = fallbackMin
      if (!maxDate) maxDate = fallbackMax
    }
  }
  
  console.log(`Raw table stats for ${rawTableName}: ${totalRowCount || rawRows.length} rows, date range: ${minDate} to ${maxDate}`)

  // Normalize rows
  const normalizedRows: UsageFact[] = []

  for (const rawRow of rawRows) {
    rowsNormalized++
    try {
      const normalized = normalizeRawRow(rawRow, datasetType, accountId, datasetId, aliasMap)
      if (normalized) {
        normalizedRows.push(normalized)
      }
    } catch (error) {
      if (rowsNormalized <= 5 || rowsNormalized % 10000 === 0) {
        console.error(`Error normalizing row ${rowsNormalized}:`, error)
      }
    }

    // Log progress every 10k rows
    if (rowsNormalized % 10000 === 0) {
      console.log(`Normalized ${rowsNormalized}/${rawRows.length} rows (${Math.round((rowsNormalized / rawRows.length) * 100)}%)`)
    }
  }

  console.log(`Normalized ${normalizedRows.length} rows from ${rowsNormalized} raw rows`)

  if (normalizedRows.length === 0) {
    throw new ValidationError('No valid rows found after normalization')
  }

  // Insert normalized rows in batches
  const totalBatches = Math.ceil(normalizedRows.length / BATCH_SIZE)

  for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
    const batch = normalizedRows.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1

    const { error: insertError } = await supabase
      .from('usage_facts')
      .insert(batch)

    if (insertError) {
      throw new DatabaseError(
        `Failed to insert batch ${batchNumber}/${totalBatches}: ${insertError.message}`
      )
    }

    rowsInserted += batch.length

    if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
      console.log(`Inserted batch ${batchNumber}/${totalBatches} (${rowsInserted}/${normalizedRows.length} rows)`)
    }
  }

  // Update dataset with date range and row count from raw tables
  // Use totalRowCount from count query (most accurate), fallback to rawRows.length if count failed
  // Note: totalRowCount should match rawRows.length, but use DB count as source of truth
  const finalRowCount = totalRowCount !== null ? totalRowCount : rawRows.length
  
  if (totalRowCount !== null && totalRowCount !== rawRows.length) {
    console.warn(`Using database count (${totalRowCount}) instead of in-memory count (${rawRows.length}) for ${rawTableName}`)
  }
  
  const { error: updateError } = await supabase
    .from('datasets')
    .update({
      min_date: minDate,
      max_date: maxDate,
      row_count: finalRowCount,
    })
    .eq('id', datasetId)

  if (updateError) {
    console.error('Failed to update dataset with date range and row count:', updateError)
  } else {
    console.log(`Updated dataset: row_count=${finalRowCount}, min_date=${minDate}, max_date=${maxDate}`)
  }

  console.log(`Batch normalization complete: ${rowsInserted} rows inserted, date range: ${minDate} to ${maxDate}`)

  return { rowsNormalized, rowsInserted }
}

/**
 * Normalize a single raw row into UsageFact format
 */
function normalizeRawRow(
  rawRow: any,
  datasetType: string,
  accountId: string,
  datasetId: string,
  aliasMap: Map<string, string>
): UsageFact | null {
  switch (datasetType) {
    case 'acc_bim360':
      return normalizeAccBim360Row(rawRow, accountId, datasetId, aliasMap)
    case 'daily_user_cloud':
      return normalizeDailyUserCloudRow(rawRow, accountId, datasetId, aliasMap)
    case 'daily_user_desktop':
      return normalizeDailyUserDesktopRow(rawRow, accountId, datasetId, aliasMap)
    case 'manual_adjustments':
      return normalizeManualAdjustmentsRow(rawRow, accountId, datasetId, aliasMap)
    default:
      return null
  }
}

function normalizeAccBim360Row(
  rawRow: any,
  accountId: string,
  datasetId: string,
  aliasMap: Map<string, string>
): UsageFact | null {
  if (!rawRow.event_date || !rawRow.user_email || !rawRow.product_name) {
    return null
  }

  const productKey = normalizeProductNameBatch(rawRow.product_name, aliasMap)
  const userKey = normalizeUserKey(rawRow.user_email)
  const projectKey = normalizeProjectKey(rawRow.project_name)

  const dimensions: Record<string, any> = {}
  if (rawRow.feature_category) dimensions.featureCategory = rawRow.feature_category
  if (rawRow.project_id) dimensions.projectId = rawRow.project_id
  if (rawRow.raw_data) {
    Object.assign(dimensions, rawRow.raw_data)
  }

  return {
    account_id: accountId,
    dataset_id: datasetId,
    date: rawRow.event_date,
    dataset_type: 'acc_bim360',
    product_key: productKey,
    user_key: userKey,
    project_key: projectKey,
    metric_tokens: null,
    metric_events: 1,
    usage_hours: null,
    use_count: null,
    dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
  }
}

function normalizeDailyUserCloudRow(
  rawRow: any,
  accountId: string,
  datasetId: string,
  aliasMap: Map<string, string>
): UsageFact | null {
  if (!rawRow.usage_date || !rawRow.product_name || !rawRow.user_name) {
    return null
  }

  const productKey = normalizeProductNameBatch(rawRow.product_name, aliasMap)
  const userKey = normalizeUserKey(rawRow.user_name)

  const dimensions: Record<string, any> = {}
  if (rawRow.raw_data) {
    Object.assign(dimensions, rawRow.raw_data)
  }

  return {
    account_id: accountId,
    dataset_id: datasetId,
    date: rawRow.usage_date,
    dataset_type: 'daily_user_cloud',
    product_key: productKey,
    user_key: userKey,
    project_key: null,
    metric_tokens: rawRow.tokens_consumed,
    metric_events: null,
    usage_hours: null,
    use_count: null,
    dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
  }
}

function normalizeDailyUserDesktopRow(
  rawRow: any,
  accountId: string,
  datasetId: string,
  aliasMap: Map<string, string>
): UsageFact | null {
  if (!rawRow.usage_date || !rawRow.product_name || !rawRow.user_name) {
    return null
  }

  const productKey = normalizeProductNameBatch(rawRow.product_name, aliasMap)
  const userKey = normalizeUserKey(rawRow.user_name)

  const dimensions: Record<string, any> = {}
  if (rawRow.product_version) dimensions.productVersion = rawRow.product_version
  if (rawRow.machine_name) dimensions.machineName = rawRow.machine_name
  if (rawRow.license_server_name) dimensions.licenseServerName = rawRow.license_server_name
  if (rawRow.raw_data) {
    Object.assign(dimensions, rawRow.raw_data)
  }

  return {
    account_id: accountId,
    dataset_id: datasetId,
    date: rawRow.usage_date,
    dataset_type: 'daily_user_desktop',
    product_key: productKey,
    user_key: userKey,
    project_key: null,
    metric_tokens: rawRow.tokens_consumed,
    metric_events: null,
    usage_hours: rawRow.usage_hours,
    use_count: rawRow.use_count,
    dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
  }
}

function normalizeManualAdjustmentsRow(
  rawRow: any,
  accountId: string,
  datasetId: string,
  aliasMap: Map<string, string>
): UsageFact | null {
  if (!rawRow.usage_date) {
    return null
  }

  let productKey = 'n/a'
  if (rawRow.product_name && rawRow.product_name.toString().toLowerCase().trim() !== 'n/a') {
    productKey = normalizeProductNameBatch(rawRow.product_name, aliasMap)
  }

  const dimensions: Record<string, any> = {}
  if (rawRow.transaction_date) dimensions.transactionDate = rawRow.transaction_date
  if (rawRow.reason_type) dimensions.reasonType = rawRow.reason_type
  if (rawRow.reason_comment) dimensions.reasonComment = rawRow.reason_comment
  if (rawRow.raw_data) {
    Object.assign(dimensions, rawRow.raw_data)
  }

  return {
    account_id: accountId,
    dataset_id: datasetId,
    date: rawRow.usage_date,
    dataset_type: 'manual_adjustments',
    product_key: productKey,
    user_key: 'system',
    project_key: null,
    metric_tokens: rawRow.tokens_consumed,
    metric_events: null,
    usage_hours: null,
    use_count: null,
    dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
  }
}
