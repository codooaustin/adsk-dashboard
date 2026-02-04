import { SupabaseClient } from '@supabase/supabase-js'
import { detectDatasetType } from './detector'
import { parseFile } from './parser'
import { getAdapter } from './adapters'
import { RawTableRow } from './adapters/base'
import { normalizeRawDataset } from './batchNormalize'
import {
  IngestionError,
  DatasetTypeDetectionError,
  DatabaseError,
  ValidationError,
} from './errors'

export interface IngestionResult {
  success: boolean
  rowsProcessed: number
  rowsInserted: number
  minDate: string | null
  maxDate: string | null
  error?: string
}

// Keep batches small to avoid Supabase/Cloudflare 500 (payload size or timeout)
const BATCH_SIZE = 500

/**
 * Get raw table name for dataset type
 */
function getRawTableName(datasetType: string): string {
  switch (datasetType) {
    case 'acc_bim360':
      return 'acc_bim360_raw'
    case 'daily_user_cloud':
      return 'daily_user_cloud_raw'
    case 'daily_user_desktop':
      return 'daily_user_desktop_raw'
    case 'manual_adjustments':
      return 'manual_adjustments_raw'
    default:
      throw new ValidationError(`Unknown dataset type: ${datasetType}`)
  }
}

/**
 * Main ingestion orchestrator
 */
export async function ingestDataset(
  datasetId: string,
  accountId: string,
  supabase: SupabaseClient
): Promise<IngestionResult> {
  try {
    // Fetch dataset record
    const { data: dataset, error: fetchError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single()

    if (fetchError || !dataset) {
      throw new DatabaseError(`Dataset not found: ${datasetId}`)
    }

    if (dataset.account_id !== accountId) {
      throw new ValidationError('Dataset does not belong to account')
    }

    if (dataset.status !== 'queued') {
      throw new ValidationError(`Dataset is not in queued status: ${dataset.status}`)
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(dataset.storage_path)

    if (downloadError || !fileData) {
      throw new DatabaseError(`Failed to download file: ${downloadError?.message}`)
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Detect dataset type if not already set
    let datasetType = dataset.dataset_type as any
    let headers = dataset.detected_headers as string[] | null

    if (!datasetType || datasetType === 'manual_adjustments') {
      // Try to detect type
      const detection = await detectDatasetType(buffer, dataset.original_filename)
      if (detection) {
        datasetType = detection.type
        headers = detection.headers

        // Update dataset with detected type and headers
        await supabase
          .from('datasets')
          .update({
            dataset_type: datasetType,
            detected_headers: headers,
          })
          .eq('id', datasetId)
      } else {
        throw new DatasetTypeDetectionError(
          'Could not detect dataset type from headers'
        )
      }
    }

    // Parse file
    const parsed = await parseFile(buffer, dataset.original_filename)

    // Get adapter
    const adapter = getAdapter(datasetType)

    // Validate headers
    if (!adapter.validateHeaders(parsed.headers)) {
      throw new ValidationError(
        `Headers do not match expected format for ${datasetType}`
      )
    }

    // Transform rows to raw table format (fast, no normalization)
    const rawRows: RawTableRow[] = []
    let rowsProcessed = 0
    let transformErrors = 0
    const invalidReasons: Map<string, number> = new Map() // Track reasons for invalid rows
    const invalidRowSamples: Array<{ rowNumber: number; reason: string }> = [] // Sample of invalid rows

    console.log(`Starting transformation of ${parsed.rows.length} rows for dataset ${datasetId}`)

    for (const row of parsed.rows) {
      rowsProcessed++
      try {
        const rawRow = adapter.transformToRaw(row, accountId, datasetId)
        if (rawRow) {
          rawRows.push(rawRow)
        } else {
          transformErrors++
          const reason = 'transformToRaw returned null (no error thrown)'
          invalidReasons.set(reason, (invalidReasons.get(reason) || 0) + 1)
          if (invalidRowSamples.length < 100) {
            invalidRowSamples.push({ rowNumber: rowsProcessed, reason })
          }
        }
      } catch (error) {
        transformErrors++
        const reason = error instanceof Error ? error.message : String(error)
        invalidReasons.set(reason, (invalidReasons.get(reason) || 0) + 1)
        if (invalidRowSamples.length < 100) {
          invalidRowSamples.push({ rowNumber: rowsProcessed, reason })
        }
        // Don't log every error to avoid spam, we'll summarize at the end
      }

      // Log progress every 10k rows
      if (rowsProcessed % 10000 === 0) {
        console.log(`Transformed ${rowsProcessed}/${parsed.rows.length} rows (${Math.round((rowsProcessed / parsed.rows.length) * 100)}%)`)
      }
    }

    console.log(`Transformed ${rawRows.length} rows (${transformErrors} skipped/invalid) from ${rowsProcessed} total rows`)
    
    // Log detailed stats for debugging
    if (transformErrors > 0) {
      console.log(`\n=== Invalid Row Analysis ===`)
      console.log(`Total invalid rows: ${transformErrors}`)
      console.log(`\nReasons for invalid rows:`)
      const sortedReasons = Array.from(invalidReasons.entries()).sort((a, b) => b[1] - a[1])
      for (const [reason, count] of sortedReasons) {
        console.log(`  - ${reason}: ${count} rows`)
      }
      
      if (invalidRowSamples.length > 0) {
        console.log(`\nSample invalid rows (first ${Math.min(100, invalidRowSamples.length)}):`)
        invalidRowSamples.slice(0, 20).forEach(({ rowNumber, reason }) => {
          console.log(`  Row ${rowNumber}: ${reason}`)
        })
        if (invalidRowSamples.length > 20) {
          console.log(`  ... and ${invalidRowSamples.length - 20} more (see full list above)`)
        }
      }
      console.log(`===========================\n`)
    }

    if (rawRows.length === 0) {
      throw new ValidationError(
        `No valid rows found after transformation. Processed ${rowsProcessed} rows, all were invalid or skipped.`
      )
    }

    // Determine raw table name
    const rawTableName = getRawTableName(datasetType)

    // Insert raw rows in batches
    let rowsInserted = 0
    const totalBatches = Math.ceil(rawRows.length / BATCH_SIZE)

    console.log(`Inserting ${rawRows.length} rows into ${rawTableName} in ${totalBatches} batches`)

    for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
      const batch = rawRows.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1

      // Insert batch into raw table
      const { error: insertError } = await supabase
        .from(rawTableName)
        .insert(batch)

      if (insertError) {
        // #region agent log
        const payloadBytes = JSON.stringify(batch).length
        const isHtml = typeof insertError.message === 'string' && (insertError.message.includes('<!DOCTYPE') || insertError.message.includes('<html'))
        fetch('http://127.0.0.1:7245/ingest/3c35bd42-4cbb-409d-8e6d-f95a48a29e55',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'orchestrator.ts:insertError',message:'batch insert failed',data:{batchNumber,totalBatches,batchLen:batch.length,payloadBytes,isHtml,messageLen:insertError?.message?.length,code:insertError?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H5'})}).catch(()=>{});
        // #endregion
        console.error(`Failed to insert batch ${batchNumber}/${totalBatches}:`, insertError)
        const rawMsg = insertError.message ?? String(insertError)
        const safeMessage = typeof rawMsg === 'string' && (rawMsg.includes('<!DOCTYPE') || rawMsg.includes('<html')) ? `Supabase returned an error (500) at batch ${batchNumber}/${totalBatches}. Try a smaller file or try again later.` : rawMsg
        throw new DatabaseError(
          `Failed to insert batch ${batchNumber}/${totalBatches}: ${safeMessage}`
        )
      }

      rowsInserted += batch.length
      if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
        console.log(`Inserted batch ${batchNumber}/${totalBatches} into ${rawTableName} (${rowsInserted}/${rawRows.length} rows)`)
      }
    }

    console.log(`Successfully inserted ${rowsInserted} rows into ${rawTableName}`)

    // Batch normalize raw data into usage_facts
    console.log(`Starting batch normalization...`)
    const { rowsInserted: normalizedCount } = await normalizeRawDataset(
      datasetId,
      accountId,
      datasetType,
      supabase
    )

    // Get date range and row count from dataset (updated by normalizeRawDataset)
    const { data: updatedDataset } = await supabase
      .from('datasets')
      .select('min_date, max_date, row_count')
      .eq('id', datasetId)
      .single()

    const minDate = updatedDataset?.min_date || null
    const maxDate = updatedDataset?.max_date || null

    // Update dataset record with final status (row_count and dates already updated by normalizeRawDataset)
    const { error: updateError } = await supabase
      .from('datasets')
      .update({
        status: 'processed',
        error_message: null,
      })
      .eq('id', datasetId)

    if (updateError) {
      throw new DatabaseError(`Failed to update dataset: ${updateError.message}`)
    }

    return {
      success: true,
      rowsProcessed,
      rowsInserted: normalizedCount,
      minDate,
      maxDate,
    }
  } catch (error) {
    // Update dataset with error
    const errorMessage =
      error instanceof IngestionError
        ? error.message
        : error instanceof Error
        ? error.message
        : 'Unknown error'

    try {
      const { error: updateErr } = await supabase
        .from('datasets')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', datasetId)
      
      if (updateErr) {
        console.error('Failed to update dataset error status:', updateErr)
      }
    } catch (updateErr) {
      console.error('Failed to update dataset error status:', updateErr)
    }

    return {
      success: false,
      rowsProcessed: 0,
      rowsInserted: 0,
      minDate: null,
      maxDate: null,
      error: errorMessage,
    }
  }
}
