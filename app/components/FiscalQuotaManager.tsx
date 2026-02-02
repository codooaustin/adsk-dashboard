'use client'

import { useState, useEffect } from 'react'

interface FiscalQuota {
  id: string
  fiscal_year: number
  acv_quota: number
  token_quota?: number | null
  created_at: string
}

interface FiscalQuotaManagerProps {
  accountSlug: string
  contractType?: string | null
  onQuotaChange?: () => void
}

export default function FiscalQuotaManager({ accountSlug, contractType, onQuotaChange }: FiscalQuotaManagerProps) {
  const [quotas, setQuotas] = useState<FiscalQuota[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newQuota, setNewQuota] = useState({ fiscal_year: new Date().getFullYear(), acv_quota: '', token_quota: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuota, setEditQuota] = useState({ fiscal_year: 0, acv_quota: '', token_quota: '' })
  const isEBA = contractType === 'Enterprise Business Agreement'

  useEffect(() => {
    fetchQuotas()
  }, [accountSlug])

  const fetchQuotas = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountSlug}/fiscal-quotas`)
      if (response.ok) {
        const data = await response.json()
        setQuotas(data)
      }
    } catch (error) {
      console.error('Error fetching quotas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newQuota.fiscal_year || !newQuota.acv_quota) {
      alert('Please fill in both fiscal year and ACV quota')
      return
    }

    setIsAdding(true)
    try {
      const requestBody: any = {
        fiscal_year: parseInt(newQuota.fiscal_year.toString()),
        acv_quota: parseFloat(newQuota.acv_quota.toString()),
      }
      
      // Include token_quota only for EBA accounts
      if (isEBA && newQuota.token_quota) {
        requestBody.token_quota = parseFloat(newQuota.token_quota.toString())
      }

      const response = await fetch(`/api/accounts/${accountSlug}/fiscal-quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        setNewQuota({ fiscal_year: new Date().getFullYear(), acv_quota: '', token_quota: '' })
        await fetchQuotas()
        onQuotaChange?.()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add quota')
      }
    } catch (error) {
      console.error('Error adding quota:', error)
      alert('Failed to add quota')
    } finally {
      setIsAdding(false)
    }
  }

  const handleEdit = (quota: FiscalQuota) => {
    setEditingId(quota.id)
    setEditQuota({
      fiscal_year: quota.fiscal_year,
      acv_quota: quota.acv_quota.toString(),
      token_quota: quota.token_quota?.toString() || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editQuota.fiscal_year || !editQuota.acv_quota) {
      alert('Please fill in both fiscal year and ACV quota')
      return
    }

    try {
      const requestBody: any = {
        fiscal_year: parseInt(editQuota.fiscal_year.toString()),
        acv_quota: parseFloat(editQuota.acv_quota.toString()),
      }
      
      // Include token_quota only for EBA accounts
      if (isEBA) {
        requestBody.token_quota = editQuota.token_quota ? parseFloat(editQuota.token_quota.toString()) : null
      }

      const response = await fetch(`/api/accounts/${accountSlug}/fiscal-quotas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        setEditingId(null)
        await fetchQuotas()
        onQuotaChange?.()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update quota')
      }
    } catch (error) {
      console.error('Error updating quota:', error)
      alert('Failed to update quota')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fiscal quota?')) {
      return
    }

    try {
      const response = await fetch(`/api/accounts/${accountSlug}/fiscal-quotas?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchQuotas()
        onQuotaChange?.()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete quota')
      }
    } catch (error) {
      console.error('Error deleting quota:', error)
      alert('Failed to delete quota')
    }
  }

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
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return <div className="text-slate-400 text-sm">Loading quotas...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Fiscal Year ACV Quotas</h3>
      </div>

      {/* Add new quota form */}
      <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
        <div className={`grid gap-4 ${isEBA ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Fiscal Year
            </label>
            <input
              type="number"
              value={newQuota.fiscal_year}
              onChange={(e) =>
                setNewQuota({ ...newQuota, fiscal_year: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
              min="2000"
              max="2100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              ACV Quota
            </label>
            <input
              type="number"
              value={newQuota.acv_quota}
              onChange={(e) => setNewQuota({ ...newQuota, acv_quota: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
          {isEBA && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Token Quota
              </label>
              <input
                type="number"
                value={newQuota.token_quota}
                onChange={(e) => setNewQuota({ ...newQuota, token_quota: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="mt-3 px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors disabled:opacity-50 text-sm"
        >
          {isAdding ? 'Adding...' : 'Add Quota'}
        </button>
      </div>

      {/* Quotas list */}
      {quotas.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          No fiscal quotas added yet
        </div>
      ) : (
        <div className="space-y-2">
          {quotas.map((quota) => (
            <div
              key={quota.id}
              className="p-4 bg-slate-800 border border-slate-700 rounded-lg flex justify-between items-center"
            >
              {editingId === quota.id ? (
                <div className={`flex-1 grid gap-4 ${isEBA ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <input
                      type="number"
                      value={editQuota.fiscal_year}
                      onChange={(e) =>
                        setEditQuota({
                          ...editQuota,
                          fiscal_year: parseInt(e.target.value) || 0,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                        }
                      }}
                      className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                      min="2000"
                      max="2100"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={editQuota.acv_quota}
                      onChange={(e) =>
                        setEditQuota({ ...editQuota, acv_quota: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                        }
                      }}
                      className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {isEBA && (
                    <div>
                      <input
                        type="number"
                        value={editQuota.token_quota}
                        onChange={(e) =>
                          setEditQuota({ ...editQuota, token_quota: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                          }
                        }}
                        className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1">
                  <div className="text-white font-medium">
                    FY {quota.fiscal_year}: {formatCurrency(quota.acv_quota)}
                    {isEBA && quota.token_quota && (
                      <span className="text-slate-400 ml-2">
                        , {formatNumber(quota.token_quota)} Tokens
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 ml-4">
                {editingId === quota.id ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-slate-700 text-white font-medium rounded hover:bg-slate-600 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(quota)}
                      className="px-3 py-1 bg-slate-700 text-white font-medium rounded hover:bg-slate-600 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(quota.id)}
                      className="px-3 py-1 bg-red-900 text-red-200 font-medium rounded hover:bg-red-800 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
