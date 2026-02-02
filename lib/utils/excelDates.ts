/**
 * Convert Excel serial date numbers to JavaScript Date objects
 * Excel epoch: January 1, 1900 (but Excel incorrectly treats 1900 as a leap year)
 * For dates after Feb 28, 1900, we need to subtract 1 day to account for this bug
 */

const EXCEL_EPOCH = new Date(1900, 0, 1) // January 1, 1900
const EXCEL_LEAP_YEAR_BUG_DATE = new Date(1900, 1, 28) // Feb 28, 1900

/**
 * Convert Excel serial date to JavaScript Date
 * @param serial Excel serial date number (e.g., 46045)
 * @returns Date object or null if invalid
 */
export function excelSerialToDate(serial: number | null | undefined): Date | null {
  if (serial === null || serial === undefined || isNaN(serial) || serial < 1) {
    return null
  }
  
  // Excel serial dates are days since Jan 1, 1900
  // But Excel incorrectly treats 1900 as a leap year
  // For dates >= 60 (which is Feb 29, 1900), we subtract 1 day
  const days = Math.floor(serial)
  const adjustedDays = days >= 60 ? days - 1 : days
  
  const date = new Date(EXCEL_EPOCH)
  date.setDate(date.getDate() + adjustedDays - 1) // Subtract 1 because Excel counts from 1, not 0
  
  return date
}

/**
 * Convert Excel serial date to ISO date string (YYYY-MM-DD)
 * @param serial Excel serial date number
 * @returns ISO date string or null if invalid
 */
export function excelSerialToDateString(serial: number | null | undefined): string | null {
  const date = excelSerialToDate(serial)
  if (!date) {
    return null
  }
  
  // Format as YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Convert Excel serial date to Date object, handling time component if present
 * Some Excel dates include time as fractional days
 */
export function excelSerialToDateTime(serial: number | null | undefined): Date | null {
  if (serial === null || serial === undefined || isNaN(serial) || serial < 1) {
    return null
  }
  
  const date = excelSerialToDate(serial)
  if (!date) {
    return null
  }
  
  // Extract time component (fractional part of serial)
  const fractional = serial - Math.floor(serial)
  if (fractional > 0) {
    const totalSeconds = fractional * 24 * 60 * 60
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const milliseconds = Math.floor((totalSeconds % 1) * 1000)
    
    date.setHours(hours, minutes, seconds, milliseconds)
  }
  
  return date
}
