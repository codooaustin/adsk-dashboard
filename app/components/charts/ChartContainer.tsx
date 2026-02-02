'use client'

import { useRef, ReactNode } from 'react'
import { copyChartToClipboard } from '@/lib/export/chartExport'

interface ChartContainerProps {
  title: ReactNode
  children: ReactNode
  isPresentationMode?: boolean
}

export default function ChartContainer({ title, children, isPresentationMode = false }: ChartContainerProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    if (!chartRef.current) return

    try {
      await copyChartToClipboard(chartRef.current)
      // Could add a toast notification here
      console.log('Chart copied to clipboard')
    } catch (error) {
      console.error('Failed to copy chart:', error)
      alert('Failed to copy chart to clipboard')
    }
  }

  const containerClasses = isPresentationMode
    ? 'p-8 bg-black border border-slate-800 rounded-lg'
    : 'p-6 bg-black border border-slate-800 rounded-lg'

  const titleClasses = isPresentationMode
    ? 'text-2xl font-bold text-white mb-6'
    : 'text-xl font-bold text-white mb-4'

  return (
    <div className={containerClasses}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`${titleClasses} flex items-center gap-2`}>{title}</h2>
        {!isPresentationMode && (
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors text-sm"
          >
            Copy to Clipboard
          </button>
        )}
      </div>
      <div ref={chartRef} className="w-full">
        {children}
      </div>
    </div>
  )
}
