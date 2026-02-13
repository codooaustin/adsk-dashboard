'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditAccountModal from '@/app/components/EditAccountModal'
import QuotaAttainmentDisplay from '@/app/components/QuotaAttainmentDisplay'
import QuotaAttainmentTransactionsTable from '@/app/components/QuotaAttainmentTransactionsTable'
import { getCurrentFiscalYear } from '@/lib/utils/fiscalYear'

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

interface AccountDetailClientProps {
  account: Account
  fiscalQuotas: FiscalQuota[]
}

export default function AccountDetailClient({ account, fiscalQuotas }: AccountDetailClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const router = useRouter()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleEditSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-4">
              {account.logo_url && (
                <img
                  src={account.logo_url}
                  alt={`${account.name} logo`}
                  className="w-16 h-16 object-contain bg-slate-800 p-2 rounded border border-slate-700"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{account.name}</h1>
                {account.sfdc_account_id && (
                  <p className="text-slate-400 text-sm">SFDC Account ID: {account.sfdc_account_id}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors"
            >
              Edit Account
            </button>
          </div>
        </div>

        {/* Contract Information */}
        {(account.contract_type ||
          account.contract_start_date ||
          account.contract_end_date ||
          account.annual_contract_value ||
          account.token_quantity) && (
          <div className="mb-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Contract Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {account.contract_type && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Contract Type</p>
                  <p className="text-white font-medium">{account.contract_type}</p>
                </div>
              )}
              {account.contract_start_date && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Start Date</p>
                  <p className="text-white font-medium">{formatDate(account.contract_start_date)}</p>
                </div>
              )}
              {account.contract_end_date && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">End Date</p>
                  <p className="text-white font-medium">{formatDate(account.contract_end_date)}</p>
                </div>
              )}
              {account.annual_contract_value && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Annual Contract Value (ACV)</p>
                  <p className="text-white font-medium">{formatCurrency(account.annual_contract_value)}</p>
                </div>
              )}
              {/* EBA Token Quantity - Only show for Enterprise Business Agreement */}
              {account.contract_type === 'Enterprise Business Agreement' && account.token_quantity && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Token Quantity</p>
                  <p className="text-white font-medium">{formatNumber(account.token_quantity)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fiscal Quotas */}
        {fiscalQuotas.length > 0 && (
          <div className="mb-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Fiscal Year Quotas</h2>
            <table className="w-full border-collapse border border-slate-700">
              <thead>
                <tr className="bg-slate-900">
                  <th className="border border-slate-700 px-4 py-3 text-left text-sm font-medium text-slate-300">
                    Fiscal Year
                  </th>
                  <th className="border border-slate-700 px-4 py-3 text-left text-sm font-medium text-slate-300">
                    ACV
                  </th>
                  {account.contract_type === 'Enterprise Business Agreement' && (
                    <th className="border border-slate-700 px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Tokens
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fiscalQuotas.map((quota) => (
                  <tr key={quota.id} className="bg-slate-900">
                    <td className="border border-slate-700 px-4 py-3 text-white font-medium">
                      FY {quota.fiscal_year}
                    </td>
                    <td className="border border-slate-700 px-4 py-3 text-slate-400">
                      {formatCurrency(quota.acv_quota)}
                    </td>
                    {account.contract_type === 'Enterprise Business Agreement' && (
                      <td className="border border-slate-700 px-4 py-3 text-slate-400">
                        {quota.token_quota != null
                          ? formatNumber(quota.token_quota)
                          : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quota Attainment */}
        <div className="mb-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Quota Attainment</h2>
          <QuotaAttainmentDisplay accountSlug={account.slug} />
          <h3 className="text-base font-semibold text-white mt-6 mb-4">Transactions</h3>
          <QuotaAttainmentTransactionsTable
            accountSlug={account.slug}
            defaultFiscalYear={getCurrentFiscalYear()}
          />
        </div>

        {/* Notes */}
        {account.notes && (
          <div className="mb-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 mb-2">Notes</h2>
            <p className="text-slate-400 text-sm whitespace-pre-wrap">{account.notes}</p>
          </div>
        )}
      </div>

      <EditAccountModal
        account={account}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
