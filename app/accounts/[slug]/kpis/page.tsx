import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchKPIData } from '@/lib/dashboard/kpis'
import {
  fetchProductTokenTableData,
  type ProductTokenTableFilters,
} from '@/lib/dashboard/productTokenTable'
import { fetchProductNamesForDashboard } from '@/lib/dashboard/productDisplay'
import KPIStrip from '@/app/components/KPIStrip'
import ProductTokenTableSection from '@/app/accounts/[slug]/kpis/ProductTokenTableSection'

interface KPIsPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string; products?: string; startDate?: string; endDate?: string }>
}

function parseFilters(searchParams: {
  mode?: string
  products?: string
  startDate?: string
  endDate?: string
}): {
  filters: ProductTokenTableFilters
  selectedProducts: string[]
  startDate: string | null
  endDate: string | null
} {
  const productNames =
    typeof searchParams.products === 'string' && searchParams.products.trim()
      ? searchParams.products.split(',').map((p) => p.trim()).filter(Boolean)
      : []
  const startDate =
    typeof searchParams.startDate === 'string' && searchParams.startDate.trim()
      ? searchParams.startDate.trim()
      : null
  const endDate =
    typeof searchParams.endDate === 'string' && searchParams.endDate.trim()
      ? searchParams.endDate.trim()
      : null
  const filters: ProductTokenTableFilters = {
    productNames: productNames.length > 0 ? productNames : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }
  return {
    filters,
    selectedProducts: productNames,
    startDate,
    endDate,
  }
}

export default async function KPIsPage({ params, searchParams }: KPIsPageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const { mode } = resolvedSearchParams
  const isPresentationMode = mode === 'present'
  const supabase = await createClient()

  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!account || accountError) {
    notFound()
  }

  const { filters, selectedProducts, startDate: initialStartDate, endDate: initialEndDate } =
    parseFilters(resolvedSearchParams)
  const hasFilters =
    (filters.productNames && filters.productNames.length > 0) ||
    filters.startDate ||
    filters.endDate

  const [kpiData, tableData, boundsData, { displayNames: productDisplayNamesMap }] =
    await Promise.all([
      fetchKPIData(account.id, supabase),
      fetchProductTokenTableData(account.id, supabase, hasFilters ? filters : undefined),
      hasFilters
        ? fetchProductTokenTableData(account.id, supabase, undefined)
        : Promise.resolve(null as Awaited<ReturnType<typeof fetchProductTokenTableData>> | null),
      fetchProductNamesForDashboard(supabase),
    ])

  const productDisplayNames = Object.fromEntries(productDisplayNamesMap)
  const allProducts =
    boundsData != null
      ? [...new Set(boundsData.rows.map((r) => r.productName))].sort()
      : [...new Set(tableData.rows.map((r) => r.productName))].sort()
  const minDate = (boundsData ?? tableData).months[0] ?? null
  const maxDate =
    (boundsData ?? tableData).months[(boundsData ?? tableData).months.length - 1] ?? null

  return (
    <div
      className={`w-full px-4 sm:px-6 lg:px-8 py-8 ${isPresentationMode ? 'py-12' : 'py-8'}`}
    >
      <div className={`mb-8 ${isPresentationMode ? 'mb-12' : ''}`}>
        <h1
          className={`font-bold text-white mb-2 ${isPresentationMode ? 'text-5xl' : 'text-3xl'}`}
        >
          {account.name}
        </h1>
        {!isPresentationMode && (
          <p className="text-slate-400 text-sm">Key metrics and product token usage</p>
        )}
      </div>

      <KPIStrip data={kpiData} isPresentationMode={isPresentationMode} />

      <div className={`mt-8 ${isPresentationMode ? 'mt-12' : ''}`}>
        <h2 className="text-xl font-semibold text-white mb-4">Token Consumption & User Growth by Product</h2>
        <ProductTokenTableSection
          tableData={tableData}
          productDisplayNames={productDisplayNames}
          initialSelectedProducts={selectedProducts}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          minDate={minDate}
          maxDate={maxDate}
          allProducts={allProducts}
          accountSlug={account.slug}
          isPresentationMode={isPresentationMode}
        />
      </div>
    </div>
  )
}
