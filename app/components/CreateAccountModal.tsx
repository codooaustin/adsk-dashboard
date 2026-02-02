'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/utils/slug'
import DateRangePicker from './charts/DateRangePicker'

export default function CreateAccountModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sfdc_account_id: '',
    notes: '',
    contract_type: '',
    contract_start_date: '',
    contract_end_date: '',
    annual_contract_value: '',
    token_quantity: '',
    initial_fiscal_year: new Date().getFullYear().toString(),
    initial_acv_quota: '',
    initial_token_quota: '',
  })
  const router = useRouter()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value })
  }

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
      // First, create the account (slug will be auto-generated server-side)
      const accountData: any = {
        name: formData.name,
        sfdc_account_id: formData.sfdc_account_id || null,
        notes: formData.notes || null,
        contract_type: formData.contract_type || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        annual_contract_value: formData.annual_contract_value ? parseFloat(formData.annual_contract_value) : null,
        token_quantity: formData.token_quantity ? parseFloat(formData.token_quantity) : null,
      }

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create account')
      }
      
      const account = await response.json()

      // Upload logo if provided
      if (logoFile && account.slug) {
        try {
          const logoFormData = new FormData()
          logoFormData.append('file', logoFile)

          const logoResponse = await fetch(`/api/accounts/${account.slug}/logo`, {
            method: 'POST',
            body: logoFormData,
          })

          if (logoResponse.ok) {
            const { logo_url } = await logoResponse.json()
            // Update account with logo URL
            await fetch(`/api/accounts/${account.slug}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ logo_url }),
            })
          }
        } catch (logoError) {
          console.warn('Failed to upload logo:', logoError)
          // Continue even if logo upload fails
        }
      }

      // Add initial fiscal quota if provided
      if (formData.initial_fiscal_year && formData.initial_acv_quota) {
        try {
          const quotaBody: any = {
            fiscal_year: parseInt(formData.initial_fiscal_year),
            acv_quota: parseFloat(formData.initial_acv_quota),
          }
          
          // Include token_quota only for EBA accounts
          if (formData.contract_type === 'Enterprise Business Agreement' && formData.initial_token_quota) {
            quotaBody.token_quota = parseFloat(formData.initial_token_quota)
          }
          
          await fetch(`/api/accounts/${account.slug}/fiscal-quotas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quotaBody),
          })
        } catch (quotaError) {
          console.warn('Failed to add initial fiscal quota:', quotaError)
          // Continue even if quota creation fails
        }
      }

      setIsOpen(false)
      setFormData({
        name: '',
        sfdc_account_id: '',
        notes: '',
        contract_type: '',
        contract_start_date: '',
        contract_end_date: '',
        annual_contract_value: '',
        token_quantity: '',
        initial_fiscal_year: new Date().getFullYear().toString(),
        initial_acv_quota: '',
        initial_token_quota: '',
      })
      setLogoFile(null)
      setLogoPreview(null)
      router.push(`/accounts/${account.slug}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating account:', error)
      alert('Failed to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const previewSlug = formData.name ? generateSlug(formData.name) : ''

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors"
      >
        Create Account
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                Create New Account
              </h2>
              <button
                onClick={() => setIsOpen(false)}
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
                  onChange={handleNameChange}
                  className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                />
                {previewSlug && (
                  <p className="text-xs text-slate-500 mt-1">
                    Slug will be: <span className="text-slate-400 font-mono">{previewSlug}</span>
                  </p>
                )}
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
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove logo
                    </button>
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

              {/* Initial Fiscal Quota */}
              <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  Initial Fiscal Year Quota (Optional)
                </h3>
                <div className={`grid gap-4 ${formData.contract_type === 'Enterprise Business Agreement' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <label
                      htmlFor="initial_fiscal_year"
                      className="block text-sm font-medium text-slate-300 mb-1"
                    >
                      Fiscal Year
                    </label>
                    <input
                      type="number"
                      id="initial_fiscal_year"
                      value={formData.initial_fiscal_year}
                      onChange={(e) =>
                        setFormData({ ...formData, initial_fiscal_year: e.target.value })
                      }
                      min="2000"
                      max="2100"
                      className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="initial_acv_quota"
                      className="block text-sm font-medium text-slate-300 mb-1"
                    >
                      ACV Quota
                    </label>
                    <input
                      type="number"
                      id="initial_acv_quota"
                      value={formData.initial_acv_quota}
                      onChange={(e) =>
                        setFormData({ ...formData, initial_acv_quota: e.target.value })
                      }
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                      placeholder="0.00"
                    />
                  </div>
                  {formData.contract_type === 'Enterprise Business Agreement' && (
                    <div>
                      <label
                        htmlFor="initial_token_quota"
                        className="block text-sm font-medium text-slate-300 mb-1"
                      >
                        Token Quota
                      </label>
                      <input
                        type="number"
                        id="initial_token_quota"
                        value={formData.initial_token_quota}
                        onChange={(e) =>
                          setFormData({ ...formData, initial_token_quota: e.target.value })
                        }
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
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
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
