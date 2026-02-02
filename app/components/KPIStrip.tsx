'use client'

import { KPIData } from '@/lib/dashboard/kpis'

interface KPIStripProps {
  data: KPIData
  isPresentationMode?: boolean
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function KPIStrip({ data, isPresentationMode = false }: KPIStripProps) {
  const cardClasses = isPresentationMode
    ? 'p-8 bg-slate-900 border border-slate-700 rounded-lg'
    : 'p-6 bg-slate-800 border border-slate-700 rounded-lg'

  const titleClasses = isPresentationMode
    ? 'text-lg font-semibold text-slate-300 mb-3'
    : 'text-sm font-semibold text-slate-300 mb-2'

  const valueClasses = isPresentationMode
    ? 'text-4xl font-bold text-white'
    : 'text-2xl font-bold text-white'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <div className={cardClasses}>
        <div className={titleClasses}>Active Users</div>
        <div className={valueClasses}>{formatNumber(data.activeUsers)}</div>
        <div className="text-xs text-slate-400 mt-1">Daily average</div>
      </div>

      <div className={cardClasses}>
        <div className={titleClasses}>Total Tokens</div>
        <div className={valueClasses}>{formatNumber(data.totalTokens)}</div>
        <div className="text-xs text-slate-400 mt-1">All time</div>
      </div>

      <div className={cardClasses}>
        <div className={titleClasses}>Projects Active</div>
        <div className={valueClasses}>{data.projectsActive.toLocaleString()}</div>
        <div className="text-xs text-slate-400 mt-1">Unique projects</div>
      </div>

      <div className={cardClasses}>
        <div className={titleClasses}>Events Count</div>
        <div className={valueClasses}>{formatNumber(data.eventsCount)}</div>
        <div className="text-xs text-slate-400 mt-1">Total events</div>
      </div>

      <div className={cardClasses}>
        <div className={titleClasses}>Power Users %</div>
        <div className={valueClasses}>{formatPercent(data.powerUsersPercent)}</div>
        <div className="text-xs text-slate-400 mt-1">Top 10% share</div>
      </div>
    </div>
  )
}
