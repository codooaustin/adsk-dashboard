'use client'

import { useRef } from 'react'
import { TimeGranularity } from '@/lib/dashboard/chartData'
import ChartContainer, { ChartCopyButton } from './ChartContainer'
import ChartFilters from './ChartFilters'
import StackedBarChart from './StackedBarChart'
import { useTokenChartData } from './useTokenChartData'

interface TokensByProductSectionProps {
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

export default function TokensByProductSection({
  accountId,
  accountSlug,
  granularity,
  productDisplayNames,
  productToTag = new Map(),
  productColors = new Map(),
  productLogos = new Map(),
  groupByTag = false,
  isPresentationMode = false,
}: TokensByProductSectionProps) {
  const {
    loading,
    hasData,
    chartData,
    chartDisplayNames,
    chartColors,
    granularity: resolvedGranularity,
    tokensByProductTitle,
    filterProps,
  } = useTokenChartData({
    accountId,
    accountSlug,
    granularity,
    productDisplayNames,
    productToTag,
    productColors,
    productLogos,
    groupByTag,
  })

  const chartRef = useRef<HTMLDivElement>(null)

  return (
    <div className="space-y-8">
      {!isPresentationMode && (
        <ChartFilters
          {...filterProps}
          rightContent={<ChartCopyButton chartRef={chartRef} />}
        />
      )}
      {loading ? (
        <ChartContainer ref={chartRef} title="Tokens by Product" isPresentationMode={isPresentationMode}>
          <div className="h-96 flex items-center justify-center text-slate-400">
            Loading chart data...
          </div>
        </ChartContainer>
      ) : !hasData ? (
        <ChartContainer ref={chartRef} title="Tokens by Product" isPresentationMode={isPresentationMode}>
          <div className="h-96 flex items-center justify-center text-slate-400">
            No data available
          </div>
        </ChartContainer>
      ) : (
        <ChartContainer ref={chartRef} title={tokensByProductTitle} isPresentationMode={isPresentationMode}>
          <StackedBarChart
            data={chartData}
            productColors={chartColors}
            productDisplayNames={chartDisplayNames}
            granularity={resolvedGranularity}
            isPresentationMode={isPresentationMode}
          />
        </ChartContainer>
      )}
    </div>
  )
}
