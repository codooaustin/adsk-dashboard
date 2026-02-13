'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartDataPoint, TimeGranularity } from '@/lib/dashboard/chartData'
import { createClient } from '@/lib/supabase/client'
import { getDateRangeForManualAdjustments, type ReasonCommentsByPoint } from '@/lib/dashboard/rawChartData'
import { aggregateChartDataByTag } from '@/lib/dashboard/productDisplay'
import ChartContainer, { ChartCopyButton } from './ChartContainer'
import ChartFilters from './ChartFilters'
import TokensOverTimeChart from './TokensOverTimeChart'

interface ManualAdjustmentsSectionProps {
  accountId: string
  accountSlug: string
  granularity: TimeGranularity
  productDisplayNames?: Map<string, string>
  productToTag?: Map<string, string | null>
  productColors?: Map<string, string>
  productLogos?: Map<string, string>
  groupByTag?: boolean
  isPresentationMode?: boolean
}

function productKeysFromData(data: ChartDataPoint[]): string[] {
  const set = new Set<string>()
  data.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') set.add(key)
    })
  })
  return Array.from(set).sort()
}

function filterCachedData(
  fullData: ChartDataPoint[],
  productFilter: string[],
  dateStart: string | null,
  dateEnd: string | null
): ChartDataPoint[] {
  let filtered = fullData
  if (dateStart || dateEnd) {
    filtered = fullData.filter((point) => {
      const pointDate = point.date
      if (dateStart && pointDate < dateStart) return false
      if (dateEnd && pointDate > dateEnd) return false
      return true
    })
  }
  if (productFilter.length > 0) {
    filtered = filtered
      .map((point) => {
        const filteredPoint: ChartDataPoint = { date: point.date }
        Object.keys(point).forEach((key) => {
          if (key === 'date') return
          if (!productFilter.includes(key)) return
          filteredPoint[key] = point[key]
        })
        return filteredPoint
      })
      .filter((point) => Object.keys(point).length > 1)
  }
  return filtered
}

export default function ManualAdjustmentsSection({
  accountId,
  accountSlug,
  granularity,
  productDisplayNames = new Map(),
  productToTag = new Map(),
  productColors = new Map(),
  productLogos = new Map(),
  groupByTag = false,
  isPresentationMode = false,
}: ManualAdjustmentsSectionProps) {
  const [cachedFullData, setCachedFullData] = useState<ChartDataPoint[]>([])
  const [reasonCommentsByPoint, setReasonCommentsByPoint] = useState<ReasonCommentsByPoint>({})
  const [cacheKey, setCacheKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [minDate, setMinDate] = useState<string | null>(null)
  const [maxDate, setMaxDate] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadDateRange() {
      const supabase = createClient()
      const dateRange = await getDateRangeForManualAdjustments(accountId, supabase)
      setMinDate(dateRange.minDate)
      setMaxDate(dateRange.maxDate)
      setStartDate(dateRange.minDate)
      setEndDate(dateRange.maxDate)
    }
    loadDateRange()
  }, [accountId])

  useEffect(() => {
    let cancelled = false
    const currentCacheKey = `${accountId}-${granularity}-${startDate ?? ''}-${endDate ?? ''}`
    const cacheKeyChanged = cacheKey !== currentCacheKey

    if (!cacheKeyChanged) {
      setLoading(false)
      return
    }

    setLoading(true)
    const params = new URLSearchParams({
      accountId,
      granularity,
      productNames: '',
    })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    fetch(
      `/api/accounts/${accountSlug}/dashboard/manual-adjustments-chart-data?${params.toString()}`
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch manual adjustments chart data')
        return res.json()
      })
      .then((body: { chartData: ChartDataPoint[]; reasonCommentsByPoint: ReasonCommentsByPoint }) => {
        if (cancelled) return
        const full = body.chartData
        const comments = body.reasonCommentsByPoint ?? {}
        const productsInData = productKeysFromData(full)
        setCachedFullData(full)
        setReasonCommentsByPoint(comments)
        setCacheKey(currentCacheKey)
        setAvailableProducts(productsInData)
        setSelectedProducts((prev) => {
          if (prev.length === 0 || !productsInData.length) return productsInData
          const next = productsInData.filter((p) => prev.includes(p))
          return next.length ? next : productsInData
        })
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('Error loading manual adjustments chart data:', e)
          setCachedFullData([])
          setReasonCommentsByPoint({})
          setCacheKey('')
          setAvailableProducts([])
          setSelectedProducts([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accountId, accountSlug, granularity, startDate, endDate])

  const productFilter =
    selectedProducts.length > 0 ? selectedProducts : availableProducts
  const chartData = useMemo(
    () => filterCachedData(cachedFullData, productFilter, startDate, endDate),
    [cachedFullData, productFilter, startDate, endDate]
  )

  const aggregated = useMemo(() => {
    if (!groupByTag || productToTag.size === 0) return null
    return aggregateChartDataByTag(
      chartData,
      productToTag,
      productDisplayNames,
      productColors
    )
  }, [groupByTag, productToTag, chartData, productDisplayNames, productColors])

  const displayData = aggregated?.data ?? chartData
  const chartDisplayNames = aggregated?.displayNames ?? productDisplayNames
  const chartColors = aggregated?.colors ?? productColors
  const hasData = displayData.length > 0

  const filtersBlock = !isPresentationMode && (
    <ChartFilters
      availableProducts={availableProducts}
      source="all"
      selectedProducts={selectedProducts}
      startDate={startDate}
      endDate={endDate}
      minDate={minDate}
      maxDate={maxDate}
      onSourceChange={() => {}}
      onProductsChange={setSelectedProducts}
      onDateRangeApply={(start, end) => {
        setStartDate(start)
        setEndDate(end)
      }}
      showSourceFilter={false}
      productDisplayNames={chartDisplayNames}
      rightContent={<ChartCopyButton chartRef={chartRef} />}
    />
  )

  return (
    <div className="space-y-8">
      {filtersBlock}
      {loading ? (
        <ChartContainer
          ref={chartRef}
          title="Manual Adjustments"
          isPresentationMode={isPresentationMode}
        >
          <div className="h-96 flex items-center justify-center text-slate-400">
            Loading chart data...
          </div>
        </ChartContainer>
      ) : !hasData ? (
        <ChartContainer
          ref={chartRef}
          title="Manual Adjustments"
          isPresentationMode={isPresentationMode}
        >
          <div className="h-96 flex items-center justify-center text-slate-400">
            No manual adjustments
          </div>
        </ChartContainer>
      ) : (
        <ChartContainer
          ref={chartRef}
          title="Manual Adjustments"
          isPresentationMode={isPresentationMode}
        >
          <TokensOverTimeChart
            data={displayData}
            productColors={chartColors}
            productDisplayNames={chartDisplayNames}
            granularity={granularity}
            isPresentationMode={isPresentationMode}
            cumulative={false}
            reasonCommentsByPoint={reasonCommentsByPoint}
          />
        </ChartContainer>
      )}
    </div>
  )
}
