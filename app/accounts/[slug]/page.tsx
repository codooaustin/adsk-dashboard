import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AccountDetailClient from './AccountDetailClient'

export default async function AccountPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (!account || error) {
    notFound()
  }

  // Fetch fiscal quotas
  const { data: fiscalQuotas } = await supabase
    .from('account_fiscal_quotas')
    .select('*')
    .eq('account_id', account.id)
    .order('fiscal_year', { ascending: false })

  return (
    <AccountDetailClient account={account} fiscalQuotas={fiscalQuotas || []} />
  )
}
