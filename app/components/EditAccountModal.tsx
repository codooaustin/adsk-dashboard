'use client'

import { useState, useEffect } from 'react'
import { generateSlug } from '@/lib/utils/slug'
import FiscalQuotaManager from './FiscalQuotaManager'
import DateRangePicker from './charts/DateRangePicker'

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
}

interface EditAccountModalProps {
  account: Account
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function EditAccountModal({
  account,
  isOpen,
  onClose,
  onSuccess,
}: EditAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(account.logo_url || null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: account.name,
    sfdc_account_id: account.sfdc_account_id || '',
    notes: account.notes || '',
    contract_type: account.contract_type || '',
    contract_start_date: account.contract_start_date || '',
    contract_end_date: account.contract_end_date || '',
    annual_contract_value: account.annual_contract_value?.toString() || '',
    token_quantity: account.token_quantity?.toString() || '',
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: account.name,
        sfdc_account_id: account.sfdc_account_id || '',
        notes: account.notes || '',
        contract_type: account.contract_type || '',
        contract_start_date: account.contract_start_date || '',
        contract_end_date: account.contract_end_date || '',
        annual_contract_value: account.annual_contract_value?.toString() || '',
        token_quantity: account.token_quantity?.toString() || '',
      })
      setLogoPreview(account.logo_url || null)
      setLogoFile(null)
    }
  }, [account, isOpen])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Upload new logo if provided
      let logoUrl = account.logo_url || null
      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('file', logoFile)

        const logoResponse = await fetch(`/api/accounts/${account.slug}/logo`, {
          method: 'POST',
          body: logoFormData,
        })

        if (logoResponse.ok) {
          const responseData = await logoResponse.json()
          logoUrl = responseData.logo_url
        } else {
          const errorData = await logoResponse.json().catch(() => ({}))
          console.warn('Failed to upload logo:', errorData.error || 'Unknown error')
        }
      } else if (!logoPreview && account.logo_url) {
        // Logo was removed
        logoUrl = null
      }

      // Update account
      const updateData: any = {
        name: formData.name,
        sfdc_account_id: formData.sfdc_account_id || null,
        notes: formData.notes || null,
        contract_type: formData.contract_type || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        annual_contract_value: formData.annual_contract_value ? parseFloat(formData.annual_contract_value) : null,
        token_quantity: formData.token_quantity ? parseFloat(formData.token_quantity) : null,
        logo_url: logoUrl,
      }

      const response = await fetch(`/api/accounts/${account.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update account')
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error updating account:', error)
      alert('Failed to update account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-2xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Edit Account</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Account Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            />
            <p className="text-xs text-slate-500 mt-1">
              Slug: <span className="text-slate-400 font-mono">{account.slug}</span> (cannot be changed)
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Logo
            </label>
            {logoPreview ? (
              <div className="space-y-2">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-32 max-w-32 object-contain bg-slate-800 p-2 rounded border border-slate-700"
                />
                <div className="flex gap-2">
                  <label className="px-3 py-1 bg-slate-700 text-white font-medium rounded hover:bg-slate-600 transition-colors text-sm cursor-pointer">
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-1 bg-red-900 text-red-200 font-medium rounded hover:bg-red-800 transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow text-sm"
              />
            )}
            <p className="text-xs text-slate-500 mt-1">
              JPG, PNG, GIF, WebP, or SVG (max 5MB)
            </p>
          </div>

          {/* Contract Type */}
          <div>
            <label
              htmlFor="contract_type"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Contract Type
            </label>
            <select
              id="contract_type"
              value={formData.contract_type}
              onChange={(e) =>
                setFormData({ ...formData, contract_type: e.target.value })
              }
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            >
              <option value="">Select contract type</option>
              <option value="Enterprise Business Agreement">Enterprise Business Agreement</option>
              <option value="Named User Subscriptions">Named User Subscriptions</option>
            </select>
          </div>

          {/* Contract Dates */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contract Dates
            </label>
            <DateRangePicker
              mode="form"
              showLabel={false}
              startDate={formData.contract_start_date || null}
              endDate={formData.contract_end_date || null}
              onStartDateChange={(date) =>
                setFormData({ ...formData, contract_start_date: date || '' })
              }
              onEndDateChange={(date) =>
                setFormData({ ...formData, contract_end_date: date || '' })
              }
            />
          </div>

          {/* Annual Contract Value */}
          <div>
            <label
              htmlFor="annual_contract_value"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Annual Contract Value (ACV)
            </label>
            <input
              type="number"
              id="annual_contract_value"
              value={formData.annual_contract_value}
              onChange={(e) =>
                setFormData({ ...formData, annual_contract_value: e.target.value })
              }
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
              placeholder="0.00"
            />
          </div>

          {/* EBA Token Quantity - Only show for Enterprise Business Agreement */}
          {formData.contract_type === 'Enterprise Business Agreement' && (
            <div>
              <label
                htmlFor="token_quantity"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Token Quantity
              </label>
              <input
                type="number"
                id="token_quantity"
                value={formData.token_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, token_quantity: e.target.value })
                }
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1">
                Token quantity for this account (does not change yearly)
              </p>
            </div>
          )}

          {/* Fiscal Quotas Management */}
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
            <FiscalQuotaManager
              accountSlug={account.slug}
              contractType={formData.contract_type}
              onQuotaChange={() => {
                // Refresh account data if needed
              }}
            />
          </div>

          {/* SFDC Account ID */}
          <div>
            <label
              htmlFor="sfdc_account_id"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              SFDC Account ID
            </label>
            <input
              type="text"
              id="sfdc_account_id"
              value={formData.sfdc_account_id}
              onChange={(e) =>
                setFormData({ ...formData, sfdc_account_id: e.target.value })
              }
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow resize-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
