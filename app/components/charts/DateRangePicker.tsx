'use client'

import { useState, useEffect } from 'react'

interface DateRangePickerProps {
  startDate: string | null
  endDate: string | null
  minDate?: string | null
  maxDate?: string | null
  onApply?: (startDate: string | null, endDate: string | null) => void
  mode?: 'filter' | 'form'
  onStartDateChange?: (date: string | null) => void
  onEndDateChange?: (date: string | null) => void
  showLabel?: boolean
}

export default function DateRangePicker({
  startDate,
  endDate,
  minDate = null,
  maxDate = null,
  onApply,
  mode = 'filter',
  onStartDateChange,
  onEndDateChange,
  showLabel = true,
}: DateRangePickerProps) {
  // Local state for user selections before applying
  const [localStartDate, setLocalStartDate] = useState<string | null>(startDate)
  const [localEndDate, setLocalEndDate] = useState<string | null>(endDate)

  // Sync local state when props change (e.g., external reset)
  useEffect(() => {
    setLocalStartDate(startDate)
    setLocalEndDate(endDate)
  }, [startDate, endDate])

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || null
    setLocalStartDate(value)
    
    // Validate: if start date is after end date, clear end date
    if (value && localEndDate && value > localEndDate) {
      setLocalEndDate(null)
      if (mode === 'form' && onEndDateChange) {
        onEndDateChange(null)
      }
    }
    
    // In form mode, call callback immediately
    if (mode === 'form' && onStartDateChange) {
      onStartDateChange(value)
    }
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || null
    setLocalEndDate(value)
    
    // Validate: if end date is before start date, clear start date
    if (value && localStartDate && value < localStartDate) {
      setLocalStartDate(null)
      if (mode === 'form' && onStartDateChange) {
        onStartDateChange(null)
      }
    }
    
    // In form mode, call callback immediately
    if (mode === 'form' && onEndDateChange) {
      onEndDateChange(value)
    }
  }

  const handleApply = () => {
    if (onApply) {
      onApply(localStartDate, localEndDate)
    }
  }

  const handleClear = () => {
    setLocalStartDate(minDate)
    setLocalEndDate(maxDate)
    if (onApply) {
      onApply(minDate, maxDate)
    }
  }

  const hasError = localStartDate && localEndDate && localStartDate > localEndDate
  const hasChanges = localStartDate !== startDate || localEndDate !== endDate
  const isFormMode = mode === 'form'

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm text-slate-300 font-medium">Date Range:</span>
      )}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={localStartDate || ''}
          onChange={handleStartDateChange}
          min={minDate || undefined}
          max={maxDate || undefined}
          className="px-3 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-hello-yellow focus:border-transparent"
        />
        <span className="text-slate-400">to</span>
        <input
          type="date"
          value={localEndDate || ''}
          onChange={handleEndDateChange}
          min={minDate || (localStartDate || undefined)}
          max={maxDate || undefined}
          className="px-3 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-hello-yellow focus:border-transparent"
        />
        {!isFormMode && (
          <>
            <button
              onClick={handleApply}
              disabled={hasError || !hasChanges}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                hasError || !hasChanges
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-hello-yellow text-black hover:bg-yellow-400'
              }`}
            >
              Apply
            </button>
            {(startDate !== minDate || endDate !== maxDate) && (
              <button
                onClick={handleClear}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Reset to full date range"
              >
                Reset
              </button>
            )}
          </>
        )}
      </div>
      {hasError && (
        <span className="text-xs text-red-400">Start date must be before end date</span>
      )}
    </div>
  )
}
