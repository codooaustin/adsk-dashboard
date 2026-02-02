'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  slug: string
}

interface CorporateAccountMappingProps {
  corporateAccountNames: string[]
  existingMappings: Record<string, string> // corporate_account_name -> account_id
  onMappingsChange: (mappings: Record<string, string>) => void
}

export default function CorporateAccountMapping({
  corporateAccountNames,
  existingMappings,
  onMappingsChange,
}: CorporateAccountMappingProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>(existingMappings)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  useEffect(() => {
    fetchAccounts()
    fetchExistingMappings()
  }, [])

  useEffect(() => {
    setMappings(existingMappings)
  }, [existingMappings])

  useEffect(() => {
    onMappingsChange(mappings)
  }, [mappings, onMappingsChange])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  const fetchExistingMappings = async () => {
    try {
      const response = await fetch('/api/corporate-account-mappings')
      if (response.ok) {
        const mappingsData = await response.json()
        // Merge with existing mappings from props
        setMappings((prev) => ({
          ...mappingsData,
          ...prev,
          ...existingMappings,
        }))
      }
    } catch (error) {
      console.error('Error fetching existing mappings:', error)
    }
  }

  const handleMappingChange = (corporateAccountName: string, accountId: string) => {
    setMappings((prev) => ({
      ...prev,
      [corporateAccountName]: accountId,
    }))
  }

  const unmappedNames = corporateAccountNames.filter(
    (name) => !mappings[name] || mappings[name] === ''
  )
  const mappedNames = corporateAccountNames.filter(
    (name) => mappings[name] && mappings[name] !== ''
  )

  if (isLoadingAccounts) {
    return <div className="text-slate-400 text-sm">Loading accounts...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Corporate Account Name Mappings
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Map each Corporate Account Name from the spreadsheet to an Account in the system.
          You can select an existing account or create a new one.
        </p>
      </div>

      {/* Unmapped Names */}
      {unmappedNames.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-slate-300">
            Unmapped Names ({unmappedNames.length})
          </h4>
          <div className="space-y-3">
            {unmappedNames.map((name) => (
              <div
                key={name}
                className="p-4 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-white font-medium">{name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={mappings[name] || ''}
                      onChange={(e) => handleMappingChange(name, e.target.value)}
                      className="px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow min-w-[200px]"
                    >
                      <option value="">Select account...</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/accounts"
                      className="px-3 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors text-sm whitespace-nowrap inline-block text-center"
                      onClick={() => {
                        // Store the corporate account name in sessionStorage for reference
                        sessionStorage.setItem('createAccountFor', name)
                      }}
                    >
                      Create New
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mapped Names */}
      {mappedNames.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-slate-300">
            Mapped Names ({mappedNames.length})
          </h4>
          <div className="space-y-2">
            {mappedNames.map((name) => {
              const account = accounts.find((a) => a.id === mappings[name])
              return (
                <div
                  key={name}
                  className="p-3 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{name}</div>
                    <div className="text-sm text-slate-400">
                      → {account?.name || 'Unknown Account'}
                    </div>
                  </div>
                  <select
                    value={mappings[name]}
                    onChange={(e) => handleMappingChange(name, e.target.value)}
                    className="px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow min-w-[200px]"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {corporateAccountNames.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No Corporate Account Names found in the file
        </div>
      )}
    </div>
  )
}
