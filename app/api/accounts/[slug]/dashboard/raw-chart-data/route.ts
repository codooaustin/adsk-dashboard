import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRawTokensTimeSeriesData, RawChartFilters } from '@/lib/dashboard/rawChartData'
import { TimeGranularity } from '@/lib/dashboard/chartData'

// Cache API responses for 5 minutes (300 seconds)
// This allows Next.js to serve cached responses instantly for repeated requests
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
    const source = (searchParams.get('source') || 'all') as 'all' | 'desktop' | 'cloud'
    const productNamesParam = searchParams.get('productNames')
    const productNames = productNamesParam ? productNamesParam.split(',').filter(Boolean) : []
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // Validate date format if provided (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (startDateParam && !dateRegex.test(startDateParam)) {
      return NextResponse.json({ error: 'Invalid startDate format. Expected YYYY-MM-DD' }, { status: 400 })
    }
    if (endDateParam && !dateRegex.test(endDateParam)) {
      return NextResponse.json({ error: 'Invalid endDate format. Expected YYYY-MM-DD' }, { status: 400 })
    }

    const supabase = await createClient()

    // Minimal account check: verify account exists. Slug was used by dashboard page to resolve accountId.
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .maybeSingle()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const filters: RawChartFilters = {
      source,
      productNames,
      startDate: startDateParam || null,
      endDate: endDateParam || null,
    }

    const chartData = await fetchRawTokensTimeSeriesData(accountId, granularity, filters, supabase)

    // #region agent log
    if (chartData.length > 0) {
      const first = (chartData[0] as { date: string }).date
      const last = (chartData[chartData.length - 1] as { date: string }).date
      const oct2025 = chartData.find((p) => String((p as { date: string }).date).startsWith('2025-10'))
      await fetch('http://127.0.0.1:7245/ingest/3c35bd42-4cbb-409d-8e6d-f95a48a29e55', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'raw-chart-data/route.ts',
          message: 'API chartData sample dates',
          data: { granularity, firstDate: first, lastDate: last, length: chartData.length, oct2025Date: oct2025 ? (oct2025 as { date: string }).date : null },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'H2',
        }),
      }).catch(() => {})
    }
    // #endregion

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Error fetching raw chart data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
