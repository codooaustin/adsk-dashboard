import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AccountCard from '@/app/components/AccountCard'
import CreateAccountModal from '@/app/components/CreateAccountModal'
import OverallQuotaAttainmentSummary from '@/app/components/OverallQuotaAttainmentSummary'

export default async function AccountsPage() {
  const supabase = await createClient()
  
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching accounts:', error)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Accounts</h1>
        <CreateAccountModal />
      </div>

      {/* Overall Quota Attainment Summary */}
      <div className="mb-8">
        <OverallQuotaAttainmentSummary />
      </div>

      {(accounts ?? []).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 mb-4">No accounts yet.</p>
          <p className="text-slate-500 text-sm">
            Create your first account to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(accounts ?? []).map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  )
}
