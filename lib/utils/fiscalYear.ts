/**
 * Calculate fiscal year from commission month and transaction date
 * Fiscal year is Feb-Jan: 
 * - January is in the same fiscal year as the calendar year (Jan 2025 = FY 2025, Jan 2026 = FY 2026)
 * - February-December are in the next fiscal year (Feb 2025 = FY 2026, Dec 2025 = FY 2026)
 */

export function calculateFiscalYear(commissionMonth: string, transactionDate: Date): number {
  const month = transactionDate.getMonth() + 1 // JavaScript months are 0-indexed
  const year = transactionDate.getFullYear()
  
  // Normalize commission month name (handle variations)
  const normalizedMonth = commissionMonth.trim().toLowerCase()
  
  // If commission month is January, fiscal year is the same as calendar year
  if (normalizedMonth === 'january' || normalizedMonth === 'jan') {
    return year
  }
  
  // For all other months (Feb-Dec), fiscal year is the next calendar year
  return year + 1
}

/**
 * Get fiscal year from a date (assuming Feb-Jan fiscal year)
 * Useful for getting current fiscal year
 * - January is in the same fiscal year as the calendar year
 * - February-December are in the next fiscal year
 */
export function getFiscalYearFromDate(date: Date): number {
  const month = date.getMonth() + 1 // JavaScript months are 0-indexed
  const year = date.getFullYear()
  
  // January is in the same fiscal year as the calendar year
  if (month === 1) {
    return year
  }
  
  // Feb-Dec are in the next fiscal year
  return year + 1
}

/**
 * Get current fiscal year
 */
export function getCurrentFiscalYear(): number {
  return getFiscalYearFromDate(new Date())
}
