'use client'

import { useState, useEffect } from 'react'

export interface ProductGroupRow {
  id: string
  name: string
  sort_order: number
  product_keys: string[]
  member_count: number
}

interface ProductRow {
  product_key: string
  canonical_name: string
}

interface GroupMembersModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  group: ProductGroupRow | null
  products: ProductRow[]
}

export default function GroupMembersModal({
  isOpen,
  onClose,
  onSuccess,
  group,
  products,
}: GroupMembersModalProps) {
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [addKey, setAddKey] = useState('')

  useEffect(() => {
    if (!isOpen || !group) {
      setMembers([])
      setAddKey('')
      return
    }
    setLoading(true)
    fetch(`/api/admin/product-groups/${group.id}/members`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { product_key: string }[]) => setMembers(data.map((m) => m.product_key)))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [isOpen, group])

  const handleAdd = async () => {
    if (!group || !addKey.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/product-groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_key: addKey.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to add member')
      }
      setMembers((prev) => [...prev, addKey.trim()].sort())
      setAddKey('')
      onSuccess()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (productKey: string) => {
    if (!group) return
    setDeleting(productKey)
    try {
      const res = await fetch(
        `/api/admin/product-groups/${group.id}/members/${encodeURIComponent(productKey)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to remove member')
      }
      setMembers((prev) => prev.filter((k) => k !== productKey))
      onSuccess()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove member')
    } finally {
      setDeleting(null)
    }
  }

  const productMap = new Map(products.map((p) => [p.product_key, p.canonical_name]))
  const availableToAdd = products.filter((p) => !members.includes(p.product_key))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Group members
            {group && <span className="text-slate-400 font-normal ml-2">({group.name})</span>}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Products in this group are aggregated as one series when “Group by product groups” is
          enabled on the dashboard.
        </p>

        <div className="flex gap-2 mb-4">
          <select
            value={addKey}
            onChange={(e) => setAddKey(e.target.value)}
            className="flex-1 px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            disabled={!group}
          >
            <option value="">Add product…</option>
            {availableToAdd.map((p) => (
              <option key={p.product_key} value={p.product_key}>
                {p.canonical_name} ({p.product_key})
              </option>
            ))}
            {availableToAdd.length === 0 && group && (
              <option value="" disabled>
                All products already in group
              </option>
            )}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!group || !addKey || adding}
            className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-slate-500 text-sm">No members. Add products above.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {members.map((key) => (
              <li
                key={key}
                className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded border border-slate-700"
              >
                <span className="text-white">
                  {productMap.get(key) ?? key}
                  <span className="text-slate-500 font-mono text-sm ml-1">({key})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(key)}
                  disabled={deleting === key}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                >
                  {deleting === key ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
