import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchManualAdjustmentsTimeSeriesData,
  ManualAdjustmentsChartFilters,
} from '@/lib/dashboard/rawChartData'
import { TimeGranularity } from '@/lib/dashboard/chartData'

export const revalidate = 300

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)

    const accountId = searchParams.get('accountId')
    const granularity = (searchParams.get('granularity') || 'day') as TimeGranularity
    const productNamesParam = searchParams.get('productNames')
    const productNames = productNamesParam ? productNamesParam.split(',').filter(Boolean) : []
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (startDateParam && !dateRegex.test(startDateParam)) {
      return NextResponse.json(
        { error: 'Invalid startDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }
    if (endDateParam && !dateRegex.test(endDateParam)) {
      return NextResponse.json(
        { error: 'Invalid endDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .maybeSingle()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const filters: ManualAdjustmentsChartFilters = {
      productNames,
      startDate: startDateParam || null,
      endDate: endDateParam || null,
    }

    const { chartData, reasonCommentsByPoint } = await fetchManualAdjustmentsTimeSeriesData(
      accountId,
      granularity,
      filters,
      supabase
    )

    return NextResponse.json({ chartData, reasonCommentsByPoint })
  } catch (error) {
    console.error('Error fetching manual adjustments chart data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
