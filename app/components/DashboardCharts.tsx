'use client'

import { TimeGranularity } from '@/lib/dashboard/chartData'
import TokensByProductSection from './charts/TokensByProductSection'
import TokensConsumedOverTimeSection from './charts/TokensConsumedOverTimeSection'
import ManualAdjustmentsSection from './charts/ManualAdjustmentsSection'
import EventsOverTimeChart from './charts/EventsOverTimeChart'
import HoursByProductChart from './charts/HoursByProductChart'
import UsersByProductChart from './charts/UsersByProductChart'
import TopUsersTable from './TopUsersTable'
import ProjectActivityChart from './charts/ProjectActivityChart'
import TimeGranularitySelector from './TimeGranularitySelector'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface DashboardChartsProps {
  accountId: string
  productDisplayNames?: Record<string, string>
  productToTag?: Record<string, string | null>
  productColors?: Record<string, string>
  productLogos?: Record<string, string>
  groupByTag?: boolean
  granularity: TimeGranularity
  isPresentationMode?: boolean
}

export default function DashboardCharts({
  accountId,
  productDisplayNames: productDisplayNamesObj = {},
  productToTag: productToTagObj = {},
  productColors: productColorsObj = {},
  productLogos: productLogosObj = {},
  groupByTag = false,
  granularity,
  isPresentationMode = false,
}: DashboardChartsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const accountSlug = pathname.split('/')[2] || ''
  const productDisplayNames = new Map(Object.entries(productDisplayNamesObj))
  const productToTag = new Map(
    Object.entries(productToTagObj).map(([k, v]) => [k, v as string | null])
  )
  const productColors = new Map(Object.entries(productColorsObj))
  const productLogos = new Map(Object.entries(productLogosObj))

  const handleGranularityChange = (newGranularity: TimeGranularity) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('granularity', newGranularity)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleGroupByTagToggle = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (groupByTag) {
      params.delete('groupBy')
    } else {
      params.set('groupBy', 'tag')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-8">
      {!isPresentationMode && (
        <div className="flex flex-wrap justify-end items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByTag}
              onChange={handleGroupByTagToggle}
              className="w-4 h-4 text-hello-yellow bg-slate-900 border-slate-600 rounded focus:ring-hello-yellow"
            />
            <span className="text-sm text-slate-300">Group by tag</span>
          </label>
          <TimeGranularitySelector
            value={granularity}
            onChange={handleGranularityChange}
          />
        </div>
      )}

      <TokensByProductSection
        accountId={accountId}
        accountSlug={accountSlug}
        granularity={granularity}
        productDisplayNames={productDisplayNames}
        productToTag={productToTag}
        productColors={productColors}
        productLogos={productLogos}
        groupByTag={groupByTag}
        isPresentationMode={isPresentationMode}
      />

      <UsersByProductChart
        accountId={accountId}
        accountSlug={accountSlug}
        granularity={granularity}
        productDisplayNames={productDisplayNames}
        productToTag={productToTag}
        productColors={productColors}
        productLogos={productLogos}
        groupByTag={groupByTag}
        isPresentationMode={isPresentationMode}
      />

      <HoursByProductChart
        accountId={accountId}
        accountSlug={accountSlug}
        granularity={granularity}
        productDisplayNames={productDisplayNames}
        productToTag={productToTag}
        productColors={productColors}
        productLogos={productLogos}
        groupByTag={groupByTag}
        isPresentationMode={isPresentationMode}
      />

      <EventsOverTimeChart
        accountId={accountId}
        accountSlug={accountSlug}
        granularity={granularity}
        productDisplayNames={productDisplayNames}
        productToTag={productToTag}
        productColors={productColors}
        productLogos={productLogos}
        groupByTag={groupByTag}
        isPresentationMode={isPresentationMode}
      />

      <TokensConsumedOverTimeSection
        accountId={accountId}
        accountSlug={accountSlug}
        granularity={granularity}
        productDisplayNames={productDisplayNames}
        productToTag={productToTag}
        productColors={productColors}
        productLogos={productLogos}
        groupByTag={groupByTag}
        isPresentationMode={isPresentationMode}
      />

      <ManualAdjustmentsSection
        accountId={accountId}
        accountSlug={accountSlug}
        granularity={granularity}
        productDisplayNames={productDisplayNames}
        productToTag={productToTag}
        productColors={productColors}
        productLogos={productLogos}
        groupByTag={groupByTag}
        isPresentationMode={isPresentationMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={isPresentationMode ? 'p-8 bg-black border border-slate-800 rounded-lg' : 'p-6 bg-black border border-slate-800 rounded-lg'}>
          <h2 className={`font-bold text-white mb-4 ${isPresentationMode ? 'text-2xl' : 'text-xl'}`}>
            Top Users
          </h2>
          <TopUsersTable accountId={accountId} />
        </div>

        <div className={isPresentationMode ? 'p-8 bg-black border border-slate-800 rounded-lg' : 'p-6 bg-black border border-slate-800 rounded-lg'}>
          <h2 className={`font-bold text-white mb-4 ${isPresentationMode ? 'text-2xl' : 'text-xl'}`}>
            Project Activity
          </h2>
          <ProjectActivityChart accountId={accountId} />
        </div>
      </div>
    </div>
  )
}
