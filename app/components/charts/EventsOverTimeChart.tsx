'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartDataPoint } from '@/lib/dashboard/chartData'
import { TimeGranularity } from '@/lib/dashboard/chartData'
import { formatChartPeriodDate } from '@/lib/dashboard/formatChartDate'
import { createClient } from '@/lib/supabase/client'
import { getAvailableProductsForEvents, getDateRangeForEvents } from '@/lib/dashboard/rawChartData'
import { aggregateChartDataByTag } from '@/lib/dashboard/productDisplay'
import ChartContainer from './ChartContainer'
import ChartFilters from './ChartFilters'
import { chartTitleContent } from './ChartTitleContent'

interface EventsOverTimeChartProps {
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

export default function EventsOverTimeChart({
  accountId,
  accountSlug,
  granularity,
  productDisplayNames,
  productToTag = new Map(),
  productColors = new Map(),
  productLogos = new Map(),
  groupByTag = false,
  isPresentationMode = false,
}: EventsOverTimeChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [minDate, setMinDate] = useState<string | null>(null)
  const [maxDate, setMaxDate] = useState<string | null>(null)
  
  // Client-side caching: cache full dataset per granularity and date range
  const [cachedFullData, setCachedFullData] = useState<ChartDataPoint[]>([])
  const [cacheKey, setCacheKey] = useState<string>('') // Tracks accountId + granularity + date range

  // Filter cached data client-side based on product and date filters
  function filterCachedData(
    fullData: ChartDataPoint[],
    productFilter: string[],
    dateStart: string | null,
    dateEnd: string | null
  ): ChartDataPoint[] {
    let filtered = fullData

    // Filter by date range if specified
    if (dateStart || dateEnd) {
      filtered = fullData.filter((point) => {
        const pointDate = point.date
        if (dateStart && pointDate < dateStart) return false
        if (dateEnd && pointDate > dateEnd) return false
        return true
      })
    }

    // Filter by product
    if (productFilter.length > 0) {
      filtered = filtered.map((point) => {
        const filteredPoint: ChartDataPoint = { date: point.date }
        
        Object.keys(point).forEach((key) => {
          if (key === 'date') return
          
          if (!productFilter.includes(key)) {
            return // Skip this product
          }
          
          filteredPoint[key] = point[key]
        })
        
        return filteredPoint
      }).filter((point) => {
        // Remove points with no data after filtering
        return Object.keys(point).length > 1 // More than just 'date'
      })
    }

    return filtered
  }

  // Fetch available products and date range on mount
  useEffect(() => {
    async function loadInitialData() {
      const supabase = createClient()
      const [products, dateRange] = await Promise.all([
        getAvailableProductsForEvents(accountId, supabase),
        getDateRangeForEvents(accountId, supabase),
      ])
      setAvailableProducts(products)
      // Select all products by default
      setSelectedProducts(products)
      setMinDate(dateRange.minDate)
      setMaxDate(dateRange.maxDate)
      // Set default dates to min/max (show all data by default)
      setStartDate(dateRange.minDate)
      setEndDate(dateRange.maxDate)
    }
    loadInitialData()
  }, [accountId])

  // Fetch data when filters or granularity change
  useEffect(() => {
    async function loadData() {
      if (availableProducts.length === 0) {
        setLoading(false)
        return
      }

      const currentCacheKey = `${accountId}-${granularity}-${startDate || ''}-${endDate || ''}`
      const cacheKeyChanged = cacheKey !== currentCacheKey
      
      // If cache key hasn't changed (same granularity and date range) and we have cached data, filter by products client-side
      if (!cacheKeyChanged && cachedFullData.length > 0) {
        // Only filter by products client-side (date filtering already applied in cache)
        const productFilter = selectedProducts.length > 0 ? selectedProducts : availableProducts
        const filteredData = filterCachedData(
          cachedFullData,
          productFilter,
          startDate,
          endDate
        )
        setData(filteredData)
        setLoading(false)
        return
      }

      // Need to fetch from API (granularity/date range changed or no cache)
      setLoading(true)
      
      try {
        // Fetch full dataset for current date range (all products) for caching
        const params = new URLSearchParams({
          accountId,
          granularity,
          productNames: '', // Empty means all products - we'll filter client-side
        })
        
        // Add date range parameters if specified
        if (startDate) {
          params.set('startDate', startDate)
        }
        if (endDate) {
          params.set('endDate', endDate)
        }

        const response = await fetch(`/api/accounts/${accountSlug}/dashboard/events-chart-data?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events chart data: ${response.statusText}`)
        }

        const fullChartData: ChartDataPoint[] = await response.json()
        
        // Cache the full dataset for this granularity and date range
        setCachedFullData(fullChartData)
        setCacheKey(currentCacheKey)
        
        // Apply product filter to the cached data
        const productFilter = selectedProducts.length > 0 ? selectedProducts : availableProducts
        const filteredData = filterCachedData(
          fullChartData,
          productFilter,
          startDate,
          endDate
        )
        setData(filteredData)
      } catch (error) {
        console.error('Error loading events chart data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [accountId, accountSlug, granularity, selectedProducts, startDate, endDate, availableProducts, cacheKey, cachedFullData])

  const aggregated = useMemo(() => {
    if (!groupByTag || productToTag.size === 0) return null
    return aggregateChartDataByTag(
      data,
      productToTag,
      productDisplayNames ?? new Map(),
      productColors
    )
  }, [groupByTag, productToTag, data, productDisplayNames, productColors])

  const chartData = aggregated?.data ?? data
  const chartDisplayNames = aggregated?.displayNames ?? productDisplayNames
  const chartColors = aggregated?.colors ?? productColors

  const productKeys = new Set<string>()
  chartData.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== 'date' && typeof point[key] === 'number') productKeys.add(key)
    })
  })
  const sortedProducts = Array.from(productKeys).sort()

  const displayNames = productDisplayNames ?? new Map()
  const logos = productLogos ?? new Map()
  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null
  const title = singleProduct
    ? chartTitleContent({
        metric: 'Users',
        productName: singleProduct,
        productDisplayNames: displayNames,
        productLogos: logos,
        defaultTitle: 'Users by Platform',
      })
    : 'Users by Platform'

  // Get default colors if product color not found
  const defaultColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ]

  const formatDate = (dateStr: string) => formatChartPeriodDate(dateStr, granularity)

  if (loading) {
    return (
      <ChartContainer title={title} isPresentationMode={isPresentationMode}>
        <div className="h-96 flex items-center justify-center text-slate-400">
          Loading users data...
        </div>
      </ChartContainer>
    )
  }

  if (sortedProducts.length === 0 || chartData.length === 0) {
    return (
      <ChartContainer title={title} isPresentationMode={isPresentationMode}>
        {!isPresentationMode && (
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
          />
        )}
        <div className="h-96 flex items-center justify-center text-slate-400">
          No users data available
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer title={title} isPresentationMode={isPresentationMode}>
      {!isPresentationMode && (
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
        />
      )}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#FFFFFF',
            }}
            labelFormatter={formatDate}
          />
          <Legend
            wrapperStyle={{ color: '#FFFFFF', paddingTop: '20px' }}
          />
          {sortedProducts.map((productKey, index) => {
            const color = chartColors.get(productKey) ?? defaultColors[index % defaultColors.length]
            return (
              <Bar
                key={productKey}
                dataKey={productKey}
                stackId="1"
                fill={color}
                name={(chartDisplayNames?.get(productKey) ?? productKey)}
              />
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
