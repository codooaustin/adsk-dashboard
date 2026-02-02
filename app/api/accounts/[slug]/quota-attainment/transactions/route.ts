import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const fiscalYearParam = searchParams.get('fiscal_year')
    const fiscalYear = fiscalYearParam ? parseInt(fiscalYearParam) : null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)))
    )

    const supabase = await createClient()

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const select =
      'id, transaction_date, commission_month, fiscal_year, final_credited_amount, end_user_name, product_class, offer_detail, invoice_amt_dc, sales_rep_name'

    let query = supabase
      .from('quota_attainment_transactions')
      .select(select, { count: 'exact' })
      .eq('account_id', account.id)

    if (fiscalYear !== null && !isNaN(fiscalYear)) {
      query = query.eq('fiscal_year', fiscalYear)
    }

    query = query
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false })

    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching quota attainment transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: data ?? [],
        total: count ?? 0,
        page,
        limit,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
