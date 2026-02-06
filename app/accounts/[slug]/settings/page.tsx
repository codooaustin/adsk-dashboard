import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountSettingsClient from './AccountSettingsClient'

export default async function AccountSettingsPage({
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

  const { data: fiscalQuotas } = await supabase
    .from('account_fiscal_quotas')
    .select('*')
    .eq('account_id', account.id)
    .order('fiscal_year', { ascending: false })

  return (
    <AccountSettingsClient account={account} fiscalQuotas={fiscalQuotas || []} />
  )
}
