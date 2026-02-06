'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditAccountModal from '@/app/components/EditAccountModal'
import FiscalQuotaManager from '@/app/components/FiscalQuotaManager'

interface Account {
  id: string
  name: string
  slug: string
  sfdc_account_id?: string | null
  notes?: string | null
  logo_url?: string | null
  contract_type?: string | null
  contract_start_date?: string | null
  contract_end_date?: string | null
  annual_contract_value?: number | null
  token_quantity?: number | null
  created_at: string
}

interface FiscalQuota {
  id: string
  fiscal_year: number
  acv_quota: number
  token_quota?: number | null
  created_at: string
}

interface AccountSettingsClientProps {
  account: Account
  fiscalQuotas: FiscalQuota[]
}

export default function AccountSettingsClient({ account, fiscalQuotas }: AccountSettingsClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const router = useRouter()

  const handleEditSuccess = () => {
    router.refresh()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-8">
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Account details</h2>
          <p className="text-slate-400 text-sm mb-4">
            Update account name, SFDC ID, contract information, and logo.
          </p>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors"
          >
            Edit account
          </button>
        </div>

        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Fiscal year quotas</h2>
          <FiscalQuotaManager
            accountSlug={account.slug}
            contractType={account.contract_type}
            onQuotaChange={() => router.refresh()}
          />
        </div>
      </div>

      <EditAccountModal
        account={account}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
