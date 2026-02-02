import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentFiscalYear } from '@/lib/utils/fiscalYear'

export async function GET() {
  try {
    const supabase = await createClient()
    const currentFiscalYear = getCurrentFiscalYear()

    // Fetch all quota attainment transactions for current fiscal year
    const { data: transactions, error: transactionsError } = await supabase
      .from('quota_attainment_transactions')
      .select('account_id, final_credited_amount')
      .eq('fiscal_year', currentFiscalYear)

    if (transactionsError) {
      console.error('Error fetching quota attainment transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch quota attainment' },
        { status: 500 }
      )
    }

    // Aggregate final_credited_amount across all accounts
    let totalAttainment = 0
    const accountIds = new Set<string>()
    
    for (const transaction of transactions || []) {
      if (transaction.final_credited_amount) {
        totalAttainment += parseFloat(transaction.final_credited_amount.toString())
      }
      if (transaction.account_id) {
        accountIds.add(transaction.account_id)
      }
    }

    // Fetch all fiscal quotas for current fiscal year across all accounts
    const { data: quotas, error: quotasError } = await supabase
      .from('account_fiscal_quotas')
      .select('acv_quota')
      .eq('fiscal_year', currentFiscalYear)

    if (quotasError) {
      console.error('Error fetching fiscal quotas:', quotasError)
      return NextResponse.json(
        { error: 'Failed to fetch fiscal quotas' },
        { status: 500 }
      )
    }

    // Sum all quotas for current fiscal year
    let totalQuota = 0
    for (const quota of quotas || []) {
      if (quota.acv_quota) {
        totalQuota += parseFloat(quota.acv_quota.toString())
      }
    }

    // Calculate overall percentage
    const attainmentPercentage = totalQuota && totalQuota > 0
      ? (totalAttainment / totalQuota) * 100
      : null

    return NextResponse.json({
      fiscal_year: currentFiscalYear,
      total_attainment: totalAttainment,
      total_quota: totalQuota,
      attainment_percentage: attainmentPercentage,
      account_count: accountIds.size,
    }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
