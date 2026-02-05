'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChartDataPoint } from '@/lib/dashboard/chartData'
import { TimeGranularity } from '@/lib/dashboard/chartData'
import { createClient } from '@/lib/supabase/client'
import { getDateRangeForAccount } from '@/lib/dashboard/rawChartData'
import { aggregateChartDataByTag } from '@/lib/dashboard/productDisplay'
import ChartContainer from './ChartContainer'
import ChartFilters, { SourceFilter } from './ChartFilters'
import StackedBarChart from './StackedBarChart'
import { chartTitleContent } from './ChartTitleContent'

interface UsersByProductChartProps {
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

export default function UsersByProductChart({
  accountId,
  accountSlug,
  granularity,
  productDisplayNames,
  productToTag = new Map(),
  productColors = new Map(),
  productLogos = new Map(),
  groupByTag = false,
  isPresentationMode = false,
}: UsersByProductChartProps) {
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
          `/api/accounts/${accountSlug}/dashboard/users-chart-data?${params.toString()}`
        )
        if (!res.ok) throw new Error('Failed to fetch users chart data')
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
        console.error('Error loading users chart data:', e)
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
  const chartDisplayNames = aggregated?.displayNames ?? productDisplayNames
  const chartColors = aggregated?.colors ?? productColors

  const productKeys = new Set<string>()
  chartData.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') productKeys.add(key)
    })
  })
  const hasData = chartData.length > 0 && productKeys.size > 0

  const displayNames = productDisplayNames ?? new Map()
  const logos = productLogos ?? new Map()
  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null
  const title = singleProduct
    ? chartTitleContent({
        metric: 'Users',
        productName: singleProduct,
        productDisplayNames: displayNames,
        productLogos: logos,
        defaultTitle: 'Users by Product',
      })
    : 'Users by Product'

  const filtersBlock = !isPresentationMode && (
    <ChartFilters
      availableProducts={availableProducts}
      source={source}
      selectedProducts={selectedProducts}
      startDate={startDate}
      endDate={endDate}
      minDate={minDate}
      maxDate={maxDate}
      onSourceChange={setSource}
      onProductsChange={setSelectedProducts}
      onDateRangeApply={(start, end) => {
        setStartDate(start)
        setEndDate(end)
      }}
      productDisplayNames={chartDisplayNames}
    />
  )

  if (loading) {
    return (
      <>
        {filtersBlock}
        <ChartContainer title={title} isPresentationMode={isPresentationMode}>
          <div className="h-96 flex items-center justify-center text-slate-400">
            Loading users data...
          </div>
        </ChartContainer>
      </>
    )
  }

  if (!hasData) {
    return (
      <>
        {filtersBlock}
        <ChartContainer title={title} isPresentationMode={isPresentationMode}>
          <div className="h-96 flex items-center justify-center text-slate-400">
            No users data available
          </div>
        </ChartContainer>
      </>
    )
  }

  return (
    <>
      {filtersBlock}
      <ChartContainer title={title} isPresentationMode={isPresentationMode}>
          <StackedBarChart
          data={chartData}
          productColors={chartColors}
          productDisplayNames={chartDisplayNames}
          granularity={granularity}
          isPresentationMode={isPresentationMode}
        />
      </ChartContainer>
    </>
  )
}
