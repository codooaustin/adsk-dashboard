import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseQuotaAttainmentExcel } from '@/lib/ingest/quotaAttainmentParser'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { upload_id, mappings } = body

    if (!upload_id) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    if (!mappings || typeof mappings !== 'object') {
      return NextResponse.json(
        { error: 'Mappings object is required' },
        { status: 400 }
      )
    }

    // Fetch upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('quota_attainment_uploads')
      .select('*')
      .eq('id', upload_id)
      .single()

    if (uploadError || !uploadRecord) {
      return NextResponse.json(
        { error: 'Upload record not found' },
        { status: 404 }
      )
    }

    if (uploadRecord.status === 'completed') {
      return NextResponse.json(
        { error: 'This upload has already been processed' },
        { status: 400 }
      )
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(uploadRecord.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to download uploaded file' },
        { status: 500 }
      )
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse file (Excel or CSV)
    let parsedRows
    try {
      parsedRows = parseQuotaAttainmentExcel(buffer, uploadRecord.original_filename)
    } catch (error) {
      console.error('Error parsing file:', error)
      await supabase
        .from('quota_attainment_uploads')
        .update({
          status: 'failed',
          error_message: 'Failed to parse file',
        })
        .eq('id', upload_id)
      return NextResponse.json(
        { error: 'Failed to parse file' },
        { status: 400 }
      )
    }

    // Extract unique commission months for replace logic
    const commissionMonths = new Set(parsedRows.map(row => row.commission_month).filter(Boolean))
    const commissionMonthsArray = Array.from(commissionMonths)

    // Get all account IDs that will be affected by this upload
    const accountIds = new Set(
      Object.values(mappings)
        .map((accountId: any) => {
          if (typeof accountId === 'string') {
            return accountId
          }
          return null
        })
        .filter(Boolean) as string[]
    )

    // Delete existing transactions for all commission months in this file
    // This implements the "replace all" behavior
    if (commissionMonthsArray.length > 0 && accountIds.size > 0) {
      const { error: deleteError } = await supabase
        .from('quota_attainment_transactions')
        .delete()
        .in('account_id', Array.from(accountIds))
        .in('commission_month', commissionMonthsArray)

      if (deleteError) {
        console.error('Error deleting existing transactions:', deleteError)
        await supabase
          .from('quota_attainment_uploads')
          .update({
            status: 'failed',
            error_message: 'Failed to delete existing transactions',
          })
          .eq('id', upload_id)
        return NextResponse.json(
          { error: 'Failed to delete existing transactions' },
          { status: 500 }
        )
      }
    }

    // Process each row and insert transactions
    const transactionsToInsert = []
    const newMappings: Array<{ corporate_account_name: string; account_id: string }> = []

    for (const row of parsedRows) {
      const corporateAccountName = row.corporate_account_name
      if (!corporateAccountName) {
        continue // Skip rows without Corporate Account Name
      }

      const accountId = mappings[corporateAccountName]
      if (!accountId || typeof accountId !== 'string') {
        continue // Skip unmapped rows
      }

      // Track new mappings to save
      if (!newMappings.some(m => m.corporate_account_name === corporateAccountName)) {
        newMappings.push({
          corporate_account_name: corporateAccountName,
          account_id: accountId,
        })
      }

      // Build transaction object
      const transaction: any = {
        account_id: accountId,
        upload_batch_id: upload_id,
        commission_month: row.commission_month,
        transaction_date: row.transaction_date,
        fiscal_year: row.fiscal_year,
        final_credited_amount: row.final_credited_amount,
        adsk_data_source: row.adsk_data_source,
        end_user_name: row.end_user_name,
        sales_channel: row.sales_channel,
        consulting_indicator: row.consulting_indicator,
        offer_detail: row.offer_detail,
        wws_area: row.wws_area,
        market_group: row.market_group,
        product_class: row.product_class,
        dealer_account_name: row.dealer_account_name,
        currency_code: row.currency_code,
        contract_start_date: row.contract_start_date,
        contract_end_date: row.contract_end_date,
        invoice_amt_dc: row.invoice_amt_dc,
        total_days: row.total_days,
        annual_inv_amt_dc: row.annual_inv_amt_dc,
        trigger_multiplier: row.trigger_multiplier,
        plan_currency: row.plan_currency,
        corporate_account_name: corporateAccountName,
        // All additional fields
        sales_rep_name: row.sales_rep_name,
        agreement_id: row.agreement_id,
        quota: row.quota,
        src_id: row.src_id,
        account_type: row.account_type,
        corporate_account_csn: row.corporate_account_csn,
        end_user_trade_number: row.end_user_trade_number,
        sales_team: row.sales_team,
        order_number: row.order_number,
        customer_po_number: row.customer_po_number,
        original_order_date: row.original_order_date,
        wws_geo: row.wws_geo,
        wws_sub_area: row.wws_sub_area,
        solutions_division: row.solutions_division,
        material_group: row.material_group,
        etr_indicator: row.etr_indicator,
        sold_to_customer_number: row.sold_to_customer_number,
        sold_to_customer_name: row.sold_to_customer_name,
        dealer_number: row.dealer_number,
        dealer_country: row.dealer_country,
        end_user_trade_country_cd: row.end_user_trade_country_cd,
        end_user_trade_state_province_cd: row.end_user_trade_state_province_cd,
        end_user_trade_city: row.end_user_trade_city,
        end_user_trade_zip: row.end_user_trade_zip,
        ship_to_state_region: row.ship_to_state_region,
        territory_acs: row.territory_acs,
        territory_aec: row.territory_aec,
        territory_mfg: row.territory_mfg,
        territory_me: row.territory_me,
        territory_delcam: row.territory_delcam,
        territory_innovyze: row.territory_innovyze,
        settlement_start_date: row.settlement_start_date,
        settlement_end_date: row.settlement_end_date,
        multiplier_factor: row.multiplier_factor,
        spiff_multiplier: row.spiff_multiplier,
        assignment_multiplier: row.assignment_multiplier,
        manual_transaction: row.manual_transaction,
        territory_channel: row.territory_channel,
        invoice_cycle_nbr: row.invoice_cycle_nbr,
        product_from: row.product_from,
        bsm_estore_order_origin: row.bsm_estore_order_origin,
        offer_category: row.offer_category,
        load_date: row.load_date,
        early_renewal_multiplier: row.early_renewal_multiplier,
        premium_boost_multiplier: row.premium_boost_multiplier,
        trigger_id: row.trigger_id,
        portfolio_name: row.portfolio_name,
      }

      transactionsToInsert.push(transaction)
    }

    // Insert transactions in batches (Supabase has a limit)
    const batchSize = 1000
    let insertedCount = 0

    for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
      const batch = transactionsToInsert.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('quota_attainment_transactions')
        .insert(batch)

      if (insertError) {
        console.error('Error inserting transactions:', insertError)
        await supabase
          .from('quota_attainment_uploads')
          .update({
            status: 'failed',
            error_message: `Failed to insert transactions: ${insertError.message}`,
          })
          .eq('id', upload_id)
        return NextResponse.json(
          { error: 'Failed to insert transactions' },
          { status: 500 }
        )
      }

      insertedCount += batch.length
    }

    // Save new mappings (upsert to handle existing mappings)
    if (newMappings.length > 0) {
      const { error: mappingError } = await supabase
        .from('corporate_account_mappings')
        .upsert(newMappings, {
          onConflict: 'corporate_account_name',
        })

      if (mappingError) {
        console.warn('Error saving mappings (non-fatal):', mappingError)
        // Don't fail the entire operation if mapping save fails
      }
    }

    // Update upload record status
    await supabase
      .from('quota_attainment_uploads')
      .update({
        status: 'completed',
        row_count: insertedCount,
      })
      .eq('id', upload_id)

    return NextResponse.json({
      success: true,
      inserted_count: insertedCount,
      commission_months: commissionMonthsArray,
    }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
