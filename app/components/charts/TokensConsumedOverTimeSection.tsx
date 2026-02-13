'use client'

import { useRef } from 'react'
import { TimeGranularity } from '@/lib/dashboard/chartData'
import ChartContainer, { ChartCopyButton } from './ChartContainer'
import ChartFilters from './ChartFilters'
import TokensOverTimeChart from './TokensOverTimeChart'
import { useTokenChartData } from './useTokenChartData'

interface TokensConsumedOverTimeSectionProps {
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

export default function TokensConsumedOverTimeSection({
  accountId,
  accountSlug,
  granularity,
  productDisplayNames,
  productToTag = new Map(),
  productColors = new Map(),
  productLogos = new Map(),
  groupByTag = false,
  isPresentationMode = false,
}: TokensConsumedOverTimeSectionProps) {
  const {
    loading,
    hasData,
    chartData,
    chartDisplayNames,
    chartColors,
    granularity: resolvedGranularity,
    tokensOverTimeTitle,
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
        <ChartContainer ref={chartRef} title="Tokens Consumed Over Time" isPresentationMode={isPresentationMode}>
          <div className="h-96 flex items-center justify-center text-slate-400">
            Loading chart data...
          </div>
        </ChartContainer>
      ) : !hasData ? (
        <ChartContainer ref={chartRef} title="Tokens Consumed Over Time" isPresentationMode={isPresentationMode}>
          <div className="h-96 flex items-center justify-center text-slate-400">
            No data available
          </div>
        </ChartContainer>
      ) : (
        <ChartContainer ref={chartRef} title={tokensOverTimeTitle} isPresentationMode={isPresentationMode}>
          <TokensOverTimeChart
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
