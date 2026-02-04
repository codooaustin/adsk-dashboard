'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ChartFilters from '@/app/components/charts/ChartFilters'
import ProductTokenTable from '@/app/components/ProductTokenTable'
import type { ProductTokenTableData } from '@/lib/dashboard/productTokenTable'

interface ProductTokenTableSectionProps {
  tableData: ProductTokenTableData
  productDisplayNames: Record<string, string>
  initialSelectedProducts: string[]
  initialStartDate: string | null
  initialEndDate: string | null
  minDate: string | null
  maxDate: string | null
  allProducts: string[]
  accountSlug: string
  isPresentationMode: boolean
}

export default function ProductTokenTableSection({
  tableData,
  productDisplayNames,
  initialSelectedProducts,
  initialStartDate,
  initialEndDate,
  minDate,
  maxDate,
  allProducts,
  accountSlug,
  isPresentationMode,
}: ProductTokenTableSectionProps) {
  const router = useRouter()

  const buildUrl = useCallback(
    (products: string[], startDate: string | null, endDate: string | null) => {
      const pathname = `/accounts/${accountSlug}/kpis`
      const params = new URLSearchParams()
      if (isPresentationMode) params.set('mode', 'present')
      if (products.length > 0) params.set('products', products.join(','))
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const q = params.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [accountSlug, isPresentationMode]
  )

  const handleProductsChange = useCallback(
    (products: string[]) => {
      router.push(buildUrl(products, initialStartDate, initialEndDate))
    },
    [router, buildUrl, initialStartDate, initialEndDate]
  )

  const handleDateRangeApply = useCallback(
    (startDate: string | null, endDate: string | null) => {
      router.push(buildUrl(initialSelectedProducts, startDate, endDate))
    },
    [router, buildUrl, initialSelectedProducts]
  )

  const productDisplayNamesMap = new Map(Object.entries(productDisplayNames))

  return (
    <>
      {!isPresentationMode && (
        <ChartFilters
          availableProducts={allProducts}
          source="all"
          selectedProducts={initialSelectedProducts}
          startDate={initialStartDate}
          endDate={initialEndDate}
          minDate={minDate}
          maxDate={maxDate}
          onSourceChange={() => {}}
          onProductsChange={handleProductsChange}
          onDateRangeApply={handleDateRangeApply}
          showSourceFilter={false}
          productDisplayNames={productDisplayNamesMap}
        />
      )}
      <ProductTokenTable data={tableData} productDisplayNames={productDisplayNames} />
    </>
  )
}
