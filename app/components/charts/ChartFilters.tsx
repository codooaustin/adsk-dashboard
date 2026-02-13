'use client'

import { useState, ReactNode } from 'react'
import DateRangePicker from './DateRangePicker'

export type SourceFilter = 'all' | 'desktop' | 'cloud'

interface ChartFiltersProps {
  availableProducts: string[]
  source: SourceFilter
  selectedProducts: string[]
  startDate: string | null
  endDate: string | null
  minDate: string | null
  maxDate: string | null
  onSourceChange: (source: SourceFilter) => void
  onProductsChange: (products: string[]) => void
  onDateRangeApply: (startDate: string | null, endDate: string | null) => void
  showSourceFilter?: boolean
  productDisplayNames?: Map<string, string>
  rightContent?: ReactNode
}

export default function ChartFilters({
  availableProducts,
  source,
  selectedProducts,
  startDate,
  endDate,
  minDate,
  maxDate,
  onSourceChange,
  onProductsChange,
  onDateRangeApply,
  showSourceFilter = true,
  productDisplayNames,
  rightContent,
}: ChartFiltersProps) {
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const displayLabel = (key: string) => productDisplayNames?.get(key) ?? key

  const handleProductToggle = (productName: string) => {
    if (selectedProducts.includes(productName)) {
      onProductsChange(selectedProducts.filter((p) => p !== productName))
    } else {
      onProductsChange([...selectedProducts, productName])
    }
  }

  const handleSelectAll = () => {
    onProductsChange([...availableProducts])
  }

  const handleClearAll = () => {
    onProductsChange([])
  }

  const allSelected = availableProducts.length > 0 && selectedProducts.length === availableProducts.length
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < availableProducts.length

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex flex-wrap gap-4">
      {/* Date Range Filter */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        minDate={minDate}
        maxDate={maxDate}
        onApply={onDateRangeApply}
      />

      {/* Source Filter - Conditionally rendered */}
      {showSourceFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300 font-medium">Source:</span>
          <div className="flex gap-2 bg-slate-800 p-1 rounded border border-slate-700">
            <button
              onClick={() => onSourceChange('all')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                source === 'all'
                  ? 'bg-hello-yellow text-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onSourceChange('desktop')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                source === 'desktop'
                  ? 'bg-hello-yellow text-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => onSourceChange('cloud')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                source === 'cloud'
                  ? 'bg-hello-yellow text-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Cloud
            </button>
          </div>
        </div>
      )}

      {/* Product Filter */}
      <div className="flex items-center gap-2 relative">
        <span className="text-sm text-slate-300 font-medium">Products:</span>
        <div className="relative">
          <button
            onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
            className="px-3 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <span>
              {selectedProducts.length === 0
                ? 'All Products'
                : selectedProducts.length === 1
                ? displayLabel(selectedProducts[0])
                : `${selectedProducts.length} selected`}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isProductDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsProductDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-64 overflow-y-auto min-w-[200px]">
                <div className="p-2 border-b border-slate-700 flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="p-2">
                  {availableProducts.length === 0 ? (
                    <div className="text-sm text-slate-400 py-2">No products available</div>
                  ) : (
                    availableProducts.map((productName) => {
                      const isSelected = selectedProducts.includes(productName)
                      return (
                        <label
                          key={productName}
                          className="flex items-center gap-2 py-1 px-2 hover:bg-slate-700 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleProductToggle(productName)}
                            className="w-4 h-4 text-hello-yellow bg-slate-900 border-slate-600 rounded focus:ring-hello-yellow focus:ring-2"
                          />
                          <span className="text-sm text-white">{displayLabel(productName)}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {someSelected && (
          <span className="text-xs text-slate-400">
            ({selectedProducts.length} of {availableProducts.length})
          </span>
        )}
      </div>
      </div>
      {rightContent != null && <div className="ml-auto">{rightContent}</div>}
    </div>
  )
}
