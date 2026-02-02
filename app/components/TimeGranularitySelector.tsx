'use client'

import { TimeGranularity } from '@/lib/dashboard/chartData'

interface TimeGranularitySelectorProps {
  value: TimeGranularity
  onChange: (granularity: TimeGranularity) => void
}

const options: { value: TimeGranularity; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Annual' },
]

export default function TimeGranularitySelector({ value, onChange }: TimeGranularitySelectorProps) {
  return (
    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-hello-yellow text-black'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
