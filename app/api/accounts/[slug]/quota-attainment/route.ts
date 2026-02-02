import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const fiscalYearParam = searchParams.get('fiscal_year')
    const fiscalYear = fiscalYearParam ? parseInt(fiscalYearParam) : null

    const supabase = await createClient()

    // Fetch account by slug
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Build query for quota attainment aggregation
    let query = supabase
      .from('quota_attainment_transactions')
      .select('fiscal_year, final_credited_amount')
      .eq('account_id', account.id)

    if (fiscalYear !== null && !isNaN(fiscalYear)) {
      query = query.eq('fiscal_year', fiscalYear)
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Error fetching quota attainment:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch quota attainment' },
        { status: 500 }
      )
    }

    // Aggregate by fiscal year
    const aggregation: Record<number, number> = {}
    for (const transaction of transactions || []) {
      if (transaction.fiscal_year && transaction.final_credited_amount) {
        const fy = transaction.fiscal_year
        aggregation[fy] = (aggregation[fy] || 0) + parseFloat(transaction.final_credited_amount.toString())
      }
    }

    // Fetch fiscal quotas for comparison
    const { data: quotas } = await supabase
      .from('account_fiscal_quotas')
      .select('fiscal_year, acv_quota')
      .eq('account_id', account.id)

    const quotaMap = new Map<number, number>()
    for (const quota of quotas || []) {
      quotaMap.set(quota.fiscal_year, parseFloat(quota.acv_quota.toString()))
    }

    // Build response with attainment and quota data
    const results = Object.entries(aggregation).map(([fy, totalAttainment]) => {
      const fiscalYearNum = parseInt(fy)
      const quota = quotaMap.get(fiscalYearNum) || null
      const attainmentPercentage = quota && quota > 0
        ? (totalAttainment / quota) * 100
        : null

      return {
        fiscal_year: fiscalYearNum,
        total_attainment: totalAttainment,
        quota: quota,
        attainment_percentage: attainmentPercentage,
      }
    })

    // Sort by fiscal year descending
    results.sort((a, b) => b.fiscal_year - a.fiscal_year)

    // If specific fiscal year requested, return single result
    if (fiscalYear !== null && !isNaN(fiscalYear)) {
      const result = results.find(r => r.fiscal_year === fiscalYear)
      if (result) {
        return NextResponse.json(result, { status: 200 })
      }
      // Return empty result if no data for that fiscal year
      return NextResponse.json({
        fiscal_year: fiscalYear,
        total_attainment: 0,
        quota: quotaMap.get(fiscalYear) || null,
        attainment_percentage: null,
      }, { status: 200 })
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
