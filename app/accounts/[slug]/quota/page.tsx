import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuotaAttainmentDisplay from '@/app/components/QuotaAttainmentDisplay'
import QuotaAttainmentTransactionsTable from '@/app/components/QuotaAttainmentTransactionsTable'
import { getCurrentFiscalYear } from '@/lib/utils/fiscalYear'

export default async function AccountQuotaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: account, error } = await supabase
    .from('accounts')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!account || error) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Quota Attainment</h1>
      <div className="space-y-8">
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
          <QuotaAttainmentDisplay accountSlug={account.slug} />
        </div>
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Transactions</h2>
          <QuotaAttainmentTransactionsTable
            accountSlug={account.slug}
            defaultFiscalYear={getCurrentFiscalYear()}
          />
        </div>
      </div>
    </div>
  )
}
