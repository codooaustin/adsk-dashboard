import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DatasetUpload from '@/app/components/DatasetUpload'
import DatasetList from '@/app/components/DatasetList'

export default async function DatasetsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch account
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!account || accountError) {
    notFound()
  }

  // Fetch datasets for this account
  const { data: datasets, error: datasetsError } = await supabase
    .from('datasets')
    .select('*')
    .eq('account_id', account.id)
    .order('uploaded_at', { ascending: false })

  if (datasetsError) {
    console.error('Error fetching datasets:', datasetsError)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/accounts/${slug}`}
          className="text-slate-400 hover:text-white text-sm mb-2 inline-block"
        >
          ← Back to {account.name}
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">Datasets</h1>
        <p className="text-slate-400 mt-1">
          Upload and manage usage data files for {account.name}
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Upload Dataset</h2>
          <DatasetUpload accountSlug={slug} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Uploaded Datasets ({datasets?.length || 0})
          </h2>
          <DatasetList datasets={datasets || []} accountSlug={slug} />
        </section>
      </div>
    </div>
  )
}
