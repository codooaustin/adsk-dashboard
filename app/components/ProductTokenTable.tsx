'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatChartPeriodDate } from '@/lib/dashboard/formatChartDate'
import type { ProductTokenTableData, ProductTokenRow } from '@/lib/dashboard/productTokenTable'

const MIN_SCALE = 0.5

interface ProductTokenTableProps {
  data: ProductTokenTableData
  productDisplayNames?: Record<string, string>
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function getSortValue(row: ProductTokenRow, sortKey: string, displayName: (s: string) => string): number | string | null {
  if (sortKey === 'product') {
    return displayName(row.productName)
  }
  if (sortKey === 'cumulative') return row.cumulative
  if (sortKey === 'avg3m') return row.avg3m
  if (sortKey === 'avg6m') return row.avg6m
  if (sortKey === 'avg12m') return row.avg12m
  if (sortKey === 'avg18m') return row.avg18m
  if (sortKey === 'avg24m') return row.avg24m
  if (sortKey === 'avg36m') return row.avg36m
  if (sortKey === 'avgGrowth3m') return row.avgGrowth3m
  if (sortKey === 'avgGrowth6m') return row.avgGrowth6m
  if (sortKey === 'avgGrowth12m') return row.avgGrowth12m
  if (sortKey === 'avgGrowth18m') return row.avgGrowth18m
  if (sortKey === 'avgGrowth24m') return row.avgGrowth24m
  if (sortKey === 'avgGrowth36m') return row.avgGrowth36m
  return row.monthly[sortKey] ?? 0
}

function formatGrowthPercent(value: number | null): string {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export default function ProductTokenTable({ data, productDisplayNames = {} }: ProductTokenTableProps) {
  const { months, rows } = data
  const [sortKey, setSortKey] = useState<string | null>('cumulative')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [dimensions, setDimensions] = useState({
    containerWidth: 0,
    tableWidth: 0,
    tableHeight: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const scale = useMemo(() => {
    const { containerWidth, tableWidth } = dimensions
    if (containerWidth <= 0 || tableWidth <= 0) return 1
    return Math.min(1, Math.max(MIN_SCALE, containerWidth / tableWidth))
  }, [dimensions])

  const useScaledWrapper =
    dimensions.containerWidth > 0 &&
    dimensions.tableWidth > 0 &&
    dimensions.tableHeight > 0 &&
    scale < 1

  useEffect(() => {
    setDimensions({ containerWidth: 0, tableWidth: 0, tableHeight: 0 })
  }, [months.join(',')])

  useEffect(() => {
    const container = containerRef.current
    const table = tableRef.current
    if (!container || !table) return
    const update = () => {
      const tableEl = tableRef.current
      if (!tableEl || !tableEl.isConnected) return
      const cw = container.getBoundingClientRect().width
      const tw = tableEl.scrollWidth
      const th = tableEl.scrollHeight
      setDimensions((d) => {
        if (d.containerWidth === cw && d.tableWidth === tw && d.tableHeight === th) return d
        return { containerWidth: cw, tableWidth: tw, tableHeight: th }
      })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    ro.observe(table)
    return () => ro.disconnect()
  }, [months, rows.length])

  const displayName = (productName: string) => productDisplayNames[productName] ?? productName

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection(key === 'product' ? 'asc' : 'desc')
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = getSortValue(a, sortKey, displayName)
      const vb = getSortValue(b, sortKey, displayName)
      if (va == null && vb == null) return 0
      if (va == null) return dir > 0 ? -1 : 1
      if (vb == null) return dir > 0 ? 1 : -1
      if (typeof va === 'string' && typeof vb === 'string') {
        return dir * va.localeCompare(vb)
      }
      return dir * ((va as number) - (vb as number))
    })
  }, [rows, sortKey, sortDirection, productDisplayNames])

  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return null
    return (
      <span className="ml-1" aria-hidden>
        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
      </span>
    )
  }

  const thClass =
    'px-4 py-3 font-semibold border-b border-slate-700 whitespace-nowrap text-left cursor-pointer hover:text-white transition-colors'
  const thStickyClass = `${thClass} sticky left-0 bg-slate-800 min-w-[180px]`

  if (rows.length === 0) {
    return (
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-center">
        No token data available.
      </div>
    )
  }

  const tableEl = (
    <table
      ref={tableRef}
      className="text-left"
      style={
        dimensions.tableWidth > 0
          ? { width: dimensions.tableWidth, minWidth: dimensions.tableWidth }
          : undefined
      }
    >
        <thead className="bg-slate-800 text-slate-300 text-sm">
          <tr>
            <th
              className={thStickyClass}
              onClick={() => handleSort('product')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('product')}
              role="button"
              tabIndex={0}
            >
              Product
              <SortIndicator columnKey="product" />
            </th>
            {months.map((m) => (
              <th
                key={m}
                className={thClass}
                onClick={() => handleSort(m)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort(m)}
                role="button"
                tabIndex={0}
              >
                {formatChartPeriodDate(m, 'month')}
                <SortIndicator columnKey={m} />
              </th>
            ))}
            <th
              className={thClass}
              onClick={() => handleSort('cumulative')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('cumulative')}
              role="button"
              tabIndex={0}
            >
              Cumulative
              <SortIndicator columnKey="cumulative" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avg3m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avg3m')}
              role="button"
              tabIndex={0}
            >
              Avg (3m)
              <SortIndicator columnKey="avg3m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avg6m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avg6m')}
              role="button"
              tabIndex={0}
            >
              Avg (6m)
              <SortIndicator columnKey="avg6m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avg12m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avg12m')}
              role="button"
              tabIndex={0}
            >
              Avg (12m)
              <SortIndicator columnKey="avg12m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avgGrowth3m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avgGrowth3m')}
              role="button"
              tabIndex={0}
            >
              Avg growth (3m)
              <SortIndicator columnKey="avgGrowth3m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avgGrowth6m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avgGrowth6m')}
              role="button"
              tabIndex={0}
            >
              Avg growth (6m)
              <SortIndicator columnKey="avgGrowth6m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avgGrowth12m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avgGrowth12m')}
              role="button"
              tabIndex={0}
            >
              Avg growth (12m)
              <SortIndicator columnKey="avgGrowth12m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avg18m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avg18m')}
              role="button"
              tabIndex={0}
            >
              Avg (18m)
              <SortIndicator columnKey="avg18m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avg24m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avg24m')}
              role="button"
              tabIndex={0}
            >
              Avg (24m)
              <SortIndicator columnKey="avg24m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avg36m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avg36m')}
              role="button"
              tabIndex={0}
            >
              Avg (36m)
              <SortIndicator columnKey="avg36m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avgGrowth18m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avgGrowth18m')}
              role="button"
              tabIndex={0}
            >
              Avg growth (18m)
              <SortIndicator columnKey="avgGrowth18m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avgGrowth24m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avgGrowth24m')}
              role="button"
              tabIndex={0}
            >
              Avg growth (24m)
              <SortIndicator columnKey="avgGrowth24m" />
            </th>
            <th
              className={thClass}
              onClick={() => handleSort('avgGrowth36m')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('avgGrowth36m')}
              role="button"
              tabIndex={0}
            >
              Avg growth (36m)
              <SortIndicator columnKey="avgGrowth36m" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {sortedRows.map((row) => (
            <tr key={row.productName} className="bg-slate-800/50 hover:bg-slate-800">
              <td className="px-4 py-3 text-white font-medium border-b border-slate-700 sticky left-0 bg-slate-800/50 hover:bg-slate-800">
                {displayName(row.productName)}
              </td>
              {months.map((m) => (
                <td key={m} className="px-4 py-3 text-slate-300 border-b border-slate-700 tabular-nums">
                  {formatNumber(row.monthly[m] ?? 0)}
                </td>
              ))}
              <td className="px-4 py-3 text-white border-b border-slate-700 tabular-nums">
                {formatNumber(row.cumulative)}
              </td>
              <td className="px-4 py-3 text-slate-300 border-b border-slate-700 tabular-nums">
                {formatNumber(row.avg3m)}
              </td>
              <td className="px-4 py-3 text-slate-300 border-b border-slate-700 tabular-nums">
                {formatNumber(row.avg6m)}
              </td>
              <td className="px-4 py-3 text-slate-300 border-b border-slate-700 tabular-nums">
                {formatNumber(row.avg12m)}
              </td>
              <td
                className={`px-4 py-3 border-b border-slate-700 tabular-nums ${
                  row.avgGrowth3m != null
                    ? row.avgGrowth3m >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {formatGrowthPercent(row.avgGrowth3m)}
              </td>
              <td
                className={`px-4 py-3 border-b border-slate-700 tabular-nums ${
                  row.avgGrowth6m != null
                    ? row.avgGrowth6m >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {formatGrowthPercent(row.avgGrowth6m)}
              </td>
              <td
                className={`px-4 py-3 border-b border-slate-700 tabular-nums ${
                  row.avgGrowth12m != null
                    ? row.avgGrowth12m >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {formatGrowthPercent(row.avgGrowth12m)}
              </td>
              <td className="px-4 py-3 text-slate-300 border-b border-slate-700 tabular-nums">
                {formatNumber(row.avg18m)}
              </td>
              <td className="px-4 py-3 text-slate-300 border-b border-slate-700 tabular-nums">
                {formatNumber(row.avg24m)}
              </td>
              <td className="px-4 py-3 text-slate-300 border-b border-slate-700 tabular-nums">
                {formatNumber(row.avg36m)}
              </td>
              <td
                className={`px-4 py-3 border-b border-slate-700 tabular-nums ${
                  row.avgGrowth18m != null
                    ? row.avgGrowth18m >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {formatGrowthPercent(row.avgGrowth18m)}
              </td>
              <td
                className={`px-4 py-3 border-b border-slate-700 tabular-nums ${
                  row.avgGrowth24m != null
                    ? row.avgGrowth24m >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {formatGrowthPercent(row.avgGrowth24m)}
              </td>
              <td
                className={`px-4 py-3 border-b border-slate-700 tabular-nums ${
                  row.avgGrowth36m != null
                    ? row.avgGrowth36m >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {formatGrowthPercent(row.avgGrowth36m)}
              </td>
            </tr>
          ))}
        </tbody>
    </table>
  )

  return (
    <div ref={containerRef} className="w-full min-w-0 rounded-lg border border-slate-700">
      {useScaledWrapper ? (
        <div
          className="overflow-hidden"
          style={{
            width: dimensions.tableWidth * scale,
            height: dimensions.tableHeight * scale,
          }}
        >
          <div
            style={{
              width: dimensions.tableWidth,
              height: dimensions.tableHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {tableEl}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto min-w-0">{tableEl}</div>
      )}
    </div>
  )
}
