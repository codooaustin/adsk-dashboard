import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { FileParseError } from './errors'

export interface ParsedFile {
  headers: string[]
  rows: Record<string, any>[]
}

/**
 * Parse a file (CSV or Excel) and return headers and rows
 */
export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedFile> {
  const extension = filename.split('.').pop()?.toLowerCase()

  try {
    if (extension === 'csv') {
      return parseCSV(buffer)
    } else if (extension === 'xlsx' || extension === 'xls') {
      return parseExcel(buffer)
    } else {
      throw new FileParseError(`Unsupported file type: ${extension}`)
    }
  } catch (error) {
    if (error instanceof FileParseError) {
      throw error
    }
    throw new FileParseError(
      `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Parse CSV file using papaparse
 */
function parseCSV(buffer: Buffer): ParsedFile {
  const text = buffer.toString('utf-8')
  
  const result = Papa.parse<Record<string, any>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => {
      // Convert empty strings to null
      return value === '' ? null : value
    },
  })

  if (result.errors.length > 0) {
    const errorMessages = result.errors.map((e) => e.message).join('; ')
    throw new FileParseError(`CSV parsing errors: ${errorMessages}`)
  }

  if (!result.data || result.data.length === 0) {
    throw new FileParseError('CSV file is empty or has no data rows')
  }

  // Get headers from first row keys
  const headers = result.meta.fields || Object.keys(result.data[0] || {})

  return {
    headers,
    rows: result.data,
  }
}

/**
 * Parse Excel file using xlsx
 */
function parseExcel(buffer: Buffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  
  if (workbook.SheetNames.length === 0) {
    throw new FileParseError('Excel file has no sheets')
  }

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to JSON with header row
  // Use raw: true to get Excel serial dates as numbers, then we'll handle conversion
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: null, // Use null for empty cells
    raw: true, // Keep raw values (numbers for dates, etc.)
    dateNF: 'yyyy-mm-dd', // Preferred date format
  })

  if (jsonData.length === 0) {
    throw new FileParseError('Excel file has no data rows')
  }

  // Get headers from first row keys
  const headers = Object.keys(jsonData[0] || {})

  // Clean up rows - convert empty strings to null
  const cleanedRows = jsonData.map((row) => {
    const cleaned: Record<string, any> = {}
    for (const [key, value] of Object.entries(row)) {
      cleaned[key] = value === '' || value === undefined ? null : value
    }
    return cleaned
  })

  return {
    headers,
    rows: cleanedRows,
  }
}
