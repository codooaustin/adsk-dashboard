'use client'

import { forwardRef, ReactNode, RefObject } from 'react'
import { copyChartToClipboard } from '@/lib/export/chartExport'

interface ChartContainerProps {
  title: ReactNode
  children: ReactNode
  isPresentationMode?: boolean
}

export const ChartCopyButton = ({
  chartRef,
  className,
}: {
  chartRef: RefObject<HTMLDivElement | null>
  className?: string
}) => {
  const handleCopy = async () => {
    if (!chartRef.current) return

    try {
      await copyChartToClipboard(chartRef.current)
      console.log('Chart copied to clipboard')
    } catch (error) {
      console.error('Failed to copy chart:', error)
      alert('Failed to copy chart to clipboard')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to Clipboard"
      aria-label="Copy to Clipboard"
      className={
        className ??
        'p-1.5 text-sm font-medium rounded transition-colors bg-hello-yellow text-black hover:bg-hello-yellow/90 inline-flex items-center justify-center'
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    </button>
  )
}

const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  function ChartContainer({ title, children, isPresentationMode = false }, ref) {
    const containerClasses = isPresentationMode
      ? 'p-8 bg-black border border-slate-800 rounded-lg'
      : 'p-6 bg-black border border-slate-800 rounded-lg'

    const titleClasses = isPresentationMode
      ? 'text-2xl font-bold text-white mb-6'
      : 'text-xl font-bold text-white mb-4'

    return (
      <div className={`${containerClasses} relative`}>
        <div ref={ref}>
          <h2 className={`${titleClasses} flex items-center gap-2`}>{title}</h2>
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    )
  }
)

export default ChartContainer
