import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TimeGranularity } from '@/lib/dashboard/chartData'
import { fetchProductNamesForDashboard } from '@/lib/dashboard/productDisplay'
import DashboardCharts from '@/app/components/DashboardCharts'

interface DashboardPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string; granularity?: TimeGranularity; groupBy?: string }>
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { slug } = await params
  const { mode, granularity = 'month', groupBy } = await searchParams
  const groupByTag = groupBy === 'tag'
  const supabase = await createClient()

  // Fetch account
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!account || accountError) {
    notFound()
  }

  const isPresentationMode = mode === 'present'

  const { displayNames: productDisplayNamesMap, productToTag, productColors: productColorsMap, productLogos: productLogosMap } =
    await fetchProductNamesForDashboard(supabase)
  const productDisplayNames = Object.fromEntries(productDisplayNamesMap)
  const productToTagObj = Object.fromEntries(productToTag)
  const productColors = Object.fromEntries(productColorsMap)
  const productLogos = Object.fromEntries(productLogosMap)

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isPresentationMode ? 'py-12' : 'py-8'}`}>
      <div className={`mb-8 ${isPresentationMode ? 'mb-12' : ''}`}>
        <h1 className={`font-bold text-white mb-2 ${isPresentationMode ? 'text-5xl' : 'text-3xl'}`}>
          {account.name}
        </h1>
        {!isPresentationMode && (
          <p className="text-slate-400 text-sm">Usage Analytics Dashboard</p>
        )}
      </div>

      <div className={`mt-8 ${isPresentationMode ? 'mt-12' : ''}`}>
        <DashboardCharts
          accountId={account.id}
          productDisplayNames={productDisplayNames}
          productToTag={productToTagObj}
          productColors={productColors}
          productLogos={productLogos}
          groupByTag={groupByTag}
          granularity={granularity}
          isPresentationMode={isPresentationMode}
        />
      </div>
    </div>
  )
}
