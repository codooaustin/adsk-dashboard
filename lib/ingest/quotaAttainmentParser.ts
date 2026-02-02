import * as XLSX from 'xlsx'
import { excelSerialToDateString } from '@/lib/utils/excelDates'
import { calculateFiscalYear } from '@/lib/utils/fiscalYear'
import Papa from 'papaparse'

export interface QuotaAttainmentRow {
  // Core identification
  sales_rep_name: string | null
  commission_month: string
  agreement_id: string | null
  quota: string | null
  adsk_data_source: string | null
  src_id: string | null
  account_type: string | null
  corporate_account_name: string
  corporate_account_csn: string | null
  end_user_trade_number: string | null
  end_user_name: string | null
  sales_channel: string | null
  sales_team: string | null
  consulting_indicator: string | null
  order_number: string | null
  customer_po_number: string | null
  transaction_date: string | null // ISO date string
  original_order_date: string | null // ISO date string
  wws_geo: string | null
  wws_area: string | null
  wws_sub_area: string | null
  offer_detail: string | null
  solutions_division: string | null
  market_group: string | null
  product_class: string | null
  material_group: string | null
  etr_indicator: string | null
  sold_to_customer_number: string | null
  sold_to_customer_name: string | null
  dealer_number: string | null
  dealer_account_name: string | null
  dealer_country: string | null
  end_user_trade_country_cd: string | null
  end_user_trade_state_province_cd: string | null
  end_user_trade_city: string | null
  end_user_trade_zip: string | null
  ship_to_state_region: string | null
  territory_acs: string | null
  territory_aec: string | null
  territory_mfg: string | null
  territory_me: string | null
  territory_delcam: string | null
  territory_innovyze: string | null
  currency_code: string | null
  contract_start_date: string | null // ISO date string
  contract_end_date: string | null // ISO date string
  settlement_start_date: string | null // ISO date string
  settlement_end_date: string | null // ISO date string
  invoice_amt_dc: number | null
  total_days: number | null
  annual_inv_amt_dc: number | null
  trigger_multiplier: number | null
  plan_currency: string | null
  final_credited_amount: number | null
  multiplier_factor: number | null
  spiff_multiplier: number | null
  assignment_multiplier: number | null
  manual_transaction: string | null
  territory_channel: string | null
  invoice_cycle_nbr: string | null
  product_from: string | null
  bsm_estore_order_origin: string | null
  offer_category: string | null
  load_date: string | null // ISO date string
  early_renewal_multiplier: number | null
  premium_boost_multiplier: number | null
  trigger_id: string | null
  portfolio_name: string | null
  // Calculated fields
  fiscal_year: number | null
}

/**
 * Parse date string in various formats (ISO, MM/DD/YYYY, etc.) to ISO date string
 */
function parseDateString(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null
  }
  
  const trimmed = dateStr.trim()
  if (!trimmed) return null
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  
  // Try MM/DD/YYYY format (common Excel format)
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (mmddyyyy) {
    const month = mmddyyyy[1].padStart(2, '0')
    const day = mmddyyyy[2].padStart(2, '0')
    const year = mmddyyyy[3]
    return `${year}-${month}-${day}`
  }
  
  // Try parsing as Date object
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  
  return null
}

/**
 * Parse quota attainment file (Excel or CSV) and return array of transaction rows
 */
export function parseQuotaAttainmentExcel(buffer: Buffer, filename?: string): QuotaAttainmentRow[] {
  // Detect file type from buffer or filename
  const isCSV = filename?.toLowerCase().endsWith('.csv') || 
                (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) || // UTF-8 BOM
                buffer.toString('utf8', 0, Math.min(100, buffer.length)).includes(',')
  
  let rows: Record<string, any>[]
  
  if (isCSV) {
    // Parse CSV
    const csvText = buffer.toString('utf8')
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim() || null,
    })
    rows = result.data as Record<string, any>[]
  } else {
    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Use raw: true to get actual Excel values (serial numbers for dates)
    rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: true, // Get raw Excel values (serial numbers for dates)
    }) as Record<string, any>[]
  }
  
  if (rows.length === 0) {
    return []
  }
  
  // Map column names from spreadsheet to database field names
  const columnMapping: Record<string, keyof QuotaAttainmentRow> = {
    'Sales Rep Name': 'sales_rep_name',
    'Commission Month': 'commission_month',
    'Agreement ID': 'agreement_id',
    'Quota': 'quota',
    'ADSK Data Source': 'adsk_data_source',
    'Src ID': 'src_id',
    'Account Type': 'account_type',
    'Corporate Account Name': 'corporate_account_name',
    'Corporate Account CSN': 'corporate_account_csn',
    'End User Trade Number': 'end_user_trade_number',
    'End User Name': 'end_user_name',
    'Sales Channel': 'sales_channel',
    'Sales Team': 'sales_team',
    'Consulting Indicator': 'consulting_indicator',
    'Order Number': 'order_number',
    'Customer PO Number': 'customer_po_number',
    'Transaction Date': 'transaction_date',
    'Original Order Date': 'original_order_date',
    'WWS Geo': 'wws_geo',
    'WWS Area': 'wws_area',
    'WWS Sub Area': 'wws_sub_area',
    'Offer Detail': 'offer_detail',
    'Solutions Division': 'solutions_division',
    'Market Group': 'market_group',
    'Product Class': 'product_class',
    'Material Group': 'material_group',
    'ETR Indicator': 'etr_indicator',
    'Sold To Customer Number': 'sold_to_customer_number',
    'Sold To Customer Name': 'sold_to_customer_name',
    'Dealer Number': 'dealer_number',
    'Dealer Account Name': 'dealer_account_name',
    'Dealer Country': 'dealer_country',
    'End User Trade Country CD': 'end_user_trade_country_cd',
    'End User Trade State Province CD': 'end_user_trade_state_province_cd',
    'End User Trade City': 'end_user_trade_city',
    'End User Trade Zip': 'end_user_trade_zip',
    'Ship To State Region': 'ship_to_state_region',
    'Territory Acs': 'territory_acs',
    'Territory AEC': 'territory_aec',
    'Territory MFG': 'territory_mfg',
    'Territory Me': 'territory_me',
    'Territory Delcam': 'territory_delcam',
    'Currency Code': 'currency_code',
    'Territory Innovyze': 'territory_innovyze',
    'Contract Start Date': 'contract_start_date',
    'Contract End Date': 'contract_end_date',
    'Settlement Start Date': 'settlement_start_date',
    'Settlement End Date': 'settlement_end_date',
    'Invoice Amt DC': 'invoice_amt_dc',
    'Total Days': 'total_days',
    'Annual Inv Amt DC': 'annual_inv_amt_dc',
    'Trigger Multiplier': 'trigger_multiplier',
    'Plan Currency': 'plan_currency',
    'Final Credited Amnt': 'final_credited_amount',
    'Multiplier Factor': 'multiplier_factor',
    'SPIFF Multiplier': 'spiff_multiplier',
    'Assignment Multiplier': 'assignment_multiplier',
    'Manual Transaction': 'manual_transaction',
    'Territory Channel': 'territory_channel',
    'Invoice Cycle Nbr': 'invoice_cycle_nbr',
    'Product From': 'product_from',
    'Bsm Estore Order Origin': 'bsm_estore_order_origin',
    'Offer Category': 'offer_category',
    'Load Date': 'load_date',
    'Early Renewal Multiplier': 'early_renewal_multiplier',
    'Premium Boost Multiplier': 'premium_boost_multiplier',
    'Trigger ID': 'trigger_id',
    'Portfolio Name': 'portfolio_name',
  }
  
  // Date fields that need Excel serial date conversion
  const dateFields = [
    'transaction_date',
    'original_order_date',
    'contract_start_date',
    'contract_end_date',
    'settlement_start_date',
    'settlement_end_date',
    'load_date',
  ]
  
  // Numeric fields
  const numericFields = [
    'invoice_amt_dc',
    'total_days',
    'annual_inv_amt_dc',
    'trigger_multiplier',
    'final_credited_amount',
    'multiplier_factor',
    'spiff_multiplier',
    'assignment_multiplier',
    'early_renewal_multiplier',
    'premium_boost_multiplier',
  ]
  
  const parsedRows: QuotaAttainmentRow[] = []
  
  for (const row of rows) {
    const parsedRow: any = {}
    
    // Map all columns
    for (const [excelColumn, dbField] of Object.entries(columnMapping)) {
      const value = row[excelColumn]
      
      if (value === null || value === undefined || value === '') {
        parsedRow[dbField] = null
      } else if (dateFields.includes(dbField)) {
        if (typeof value === 'number') {
          // Excel serial date number
          parsedRow[dbField] = excelSerialToDateString(value)
        } else if (typeof value === 'string') {
          // Date string (CSV ISO format or Excel MM/DD/YYYY format)
          parsedRow[dbField] = parseDateString(value)
        } else {
          parsedRow[dbField] = null
        }
      } else if (numericFields.includes(dbField)) {
        // Convert to number
        let numValue: number | null = null
        if (typeof value === 'number') {
          numValue = value
        } else if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '').trim()
          numValue = cleaned ? parseFloat(cleaned) : null
          if (isNaN(numValue!)) {
            numValue = null
          }
        }
        parsedRow[dbField] = numValue
      } else {
        // String field
        parsedRow[dbField] = String(value).trim() || null
      }
    }
    
    // Calculate fiscal year from commission_month and transaction_date
    if (parsedRow.commission_month && parsedRow.transaction_date) {
      try {
        const transactionDate = new Date(parsedRow.transaction_date)
        if (!isNaN(transactionDate.getTime())) {
          parsedRow.fiscal_year = calculateFiscalYear(parsedRow.commission_month, transactionDate)
        } else {
          parsedRow.fiscal_year = null
        }
      } catch (error) {
        parsedRow.fiscal_year = null
      }
    } else {
      parsedRow.fiscal_year = null
    }
    
    // Ensure commission_month is present (required field)
    if (!parsedRow.commission_month) {
      continue // Skip rows without commission month
    }
    
    parsedRows.push(parsedRow as QuotaAttainmentRow)
  }
  
  return parsedRows
}

/**
 * Extract unique commission months from parsed rows
 */
export function extractCommissionMonths(rows: QuotaAttainmentRow[]): string[] {
  const months = new Set<string>()
  for (const row of rows) {
    if (row.commission_month) {
      months.add(row.commission_month)
    }
  }
  return Array.from(months).sort()
}

/**
 * Extract unique Corporate Account Names from parsed rows
 */
export function extractCorporateAccountNames(rows: QuotaAttainmentRow[]): string[] {
  const names = new Set<string>()
  for (const row of rows) {
    if (row.corporate_account_name) {
      names.add(row.corporate_account_name)
    }
  }
  return Array.from(names).sort()
}
