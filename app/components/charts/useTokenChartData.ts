'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChartDataPoint, TimeGranularity } from '@/lib/dashboard/chartData'
import { createClient } from '@/lib/supabase/client'
import { getDateRangeForAccount } from '@/lib/dashboard/rawChartData'
import { aggregateChartDataByTag } from '@/lib/dashboard/productDisplay'
import { chartTitleContent } from './ChartTitleContent'
import type { SourceFilter } from './ChartFilters'

const GRANULARITY_LABELS: Record<TimeGranularity, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Annual',
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

export interface UseTokenChartDataParams {
  accountId: string
  accountSlug: string
  granularity: TimeGranularity
  productDisplayNames?: Map<string, string>
  productToTag?: Map<string, string | null>
  productColors?: Map<string, string>
  productLogos?: Map<string, string>
  groupByTag?: boolean
}

export interface TokenChartFilterProps {
  availableProducts: string[]
  source: SourceFilter
  selectedProducts: string[]
  startDate: string | null
  endDate: string | null
  minDate: string | null
  maxDate: string | null
  onSourceChange: (source: SourceFilter) => void
  onProductsChange: (products: string[]) => void
  onDateRangeApply: (startDate: string | null, endDate: string | null) => void
  productDisplayNames: Map<string, string>
}

export interface UseTokenChartDataResult {
  loading: boolean
  hasData: boolean
  chartData: ChartDataPoint[]
  chartDisplayNames: Map<string, string>
  chartColors: Map<string, string>
  granularity: TimeGranularity
  tokensByProductTitle: ReactNode
  tokensOverTimeTitle: ReactNode
  filterProps: TokenChartFilterProps
}

export function useTokenChartData({
  accountId,
  accountSlug,
  granularity,
  productDisplayNames,
  productToTag = new Map(),
  productColors = new Map(),
  productLogos = new Map(),
  groupByTag = false,
}: UseTokenChartDataParams): UseTokenChartDataResult {
  const [metadataReady, setMetadataReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [minDate, setMinDate] = useState<string | null>(null)
  const [maxDate, setMaxDate] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [source, setSource] = useState<SourceFilter>('all')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [cachedFullData, setCachedFullData] = useState<ChartDataPoint[]>([])
  const [cacheKey, setCacheKey] = useState<string>('')
  const [filteredData, setFilteredData] = useState<ChartDataPoint[]>([])

  useEffect(() => {
    async function loadMetadata() {
      const supabase = createClient()
      const dateRange = await getDateRangeForAccount(accountId, supabase)
      setMinDate(dateRange.minDate)
      setMaxDate(dateRange.maxDate)
      setStartDate(dateRange.minDate)
      setEndDate(dateRange.maxDate)
      setMetadataReady(true)
    }
    loadMetadata()
  }, [accountId])

  useEffect(() => {
    async function loadData() {
      if (!metadataReady) return
      const currentCacheKey = `${accountId}-${granularity}-${source}-${startDate || ''}-${endDate || ''}`
      const cacheKeyChanged = cacheKey !== currentCacheKey

      if (!cacheKeyChanged && cachedFullData.length > 0) {
        const productFilter = selectedProducts.length > 0 ? selectedProducts : availableProducts
        const next = filterCachedData(cachedFullData, productFilter, startDate, endDate)
        setFilteredData(next)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const params = new URLSearchParams({
          accountId,
          granularity,
          source,
          productNames: '',
        })
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        const res = await fetch(
          `/api/accounts/${accountSlug}/dashboard/raw-chart-data?${params.toString()}`
        )
        if (!res.ok) throw new Error('Failed to fetch chart data')
        const full: ChartDataPoint[] = await res.json()
        const keysInFull = productKeysFromData(full)
        setCachedFullData(full)
        setCacheKey(currentCacheKey)
        setAvailableProducts(keysInFull)
        setSelectedProducts(keysInFull)
        const productFilter = keysInFull
        const next = filterCachedData(full, productFilter, startDate, endDate)
        setFilteredData(next)
      } catch (e) {
        console.error('Error loading chart data:', e)
        setFilteredData([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [
    metadataReady,
    accountId,
    accountSlug,
    granularity,
    source,
    startDate,
    endDate,
    selectedProducts,
    cacheKey,
    cachedFullData,
    availableProducts,
  ])

  const aggregated = useMemo(() => {
    if (!groupByTag || productToTag.size === 0) return null
    return aggregateChartDataByTag(
      filteredData,
      productToTag,
      productDisplayNames ?? new Map(),
      productColors
    )
  }, [groupByTag, productToTag, filteredData, productDisplayNames, productColors])

  const chartData = aggregated?.data ?? filteredData
  const chartDisplayNames = aggregated?.displayNames ?? productDisplayNames ?? new Map()
  const chartColors = aggregated?.colors ?? productColors

  const displayNames = productDisplayNames ?? new Map()
  const logos = productLogos ?? new Map()
  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null
  const periodLabel = GRANULARITY_LABELS[granularity]
  const tokensByProductTitle = singleProduct
    ? chartTitleContent({
        metric: 'Tokens',
        productName: singleProduct,
        productDisplayNames: displayNames,
        productLogos: logos,
        defaultTitle: 'Tokens by Product',
        period: periodLabel,
      })
    : 'Tokens by Product'
  const tokensOverTimeTitle = singleProduct
    ? chartTitleContent({
        metric: 'Tokens',
        productName: singleProduct,
        productDisplayNames: displayNames,
        productLogos: logos,
        defaultTitle: 'Tokens Consumed Over Time',
        period: periodLabel,
      })
    : 'Tokens Consumed Over Time'

  const productKeys = new Set<string>()
  chartData.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') productKeys.add(key)
    })
  })
  const hasData = chartData.length > 0 && productKeys.size > 0

  const filterProps: TokenChartFilterProps = useMemo(
    () => ({
      availableProducts,
      source,
      selectedProducts,
      startDate,
      endDate,
      minDate,
      maxDate,
      onSourceChange: setSource,
      onProductsChange: setSelectedProducts,
      onDateRangeApply: (start, end) => {
        setStartDate(start)
        setEndDate(end)
      },
      productDisplayNames: chartDisplayNames,
    }),
    [
      availableProducts,
      source,
      selectedProducts,
      startDate,
      endDate,
      minDate,
      maxDate,
      chartDisplayNames,
    ]
  )

  return {
    loading,
    hasData,
    chartData,
    chartDisplayNames,
    chartColors,
    granularity,
    tokensByProductTitle,
    tokensOverTimeTitle,
    filterProps,
  }
}
