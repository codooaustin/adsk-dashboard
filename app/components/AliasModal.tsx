'use client'

import { useState, useEffect } from 'react'

interface ProductRow {
  product_key: string
  canonical_name: string
  category: string
  color: string | null
  logo_url: string | null
  sort_order: number
  alias_count?: number
}

interface AliasModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product: ProductRow | null
}

export default function AliasModal({ isOpen, onClose, onSuccess, product }: AliasModalProps) {
  const [aliases, setAliases] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !product) {
      setAliases([])
      setNewAlias('')
      return
    }
    setLoading(true)
    fetch(`/api/admin/products/${encodeURIComponent(product.product_key)}/aliases`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { alias: string }[]) => setAliases(data.map((a) => a.alias)))
      .catch(() => setAliases([]))
      .finally(() => setLoading(false))
  }, [isOpen, product])

  const fetchAliases = async () => {
    if (!product) return
    const res = await fetch(`/api/admin/products/${encodeURIComponent(product.product_key)}/aliases`)
    if (res.ok) {
      const data: { alias: string }[] = await res.json()
      setAliases(data.map((a) => a.alias))
    }
  }

  const handleAdd = async () => {
    if (!product || !newAlias.trim()) return
    setAdding(true)
    try {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(product.product_key)}/aliases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alias: newAlias.trim() }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to add alias')
      }
      setNewAlias('')
      await fetchAliases()
      onSuccess()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add alias')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (alias: string) => {
    if (!product) return
    setDeleting(alias)
    try {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(product.product_key)}/aliases/${encodeURIComponent(alias)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to remove alias')
      }
      await fetchAliases()
      onSuccess()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove alias')
    } finally {
      setDeleting(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Manage aliases
            {product && (
              <span className="text-slate-400 font-normal ml-2">
                ({product.canonical_name})
              </span>
            )}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Aliases map raw product names from datasets to this product. They are applied during
          ingest (future uploads).
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            placeholder="e.g. Revit 2024"
            className="flex-1 px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            disabled={!product}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!product || !newAlias.trim() || adding}
            className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : aliases.length === 0 ? (
          <p className="text-slate-500 text-sm">No aliases yet. Add one above.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {aliases.map((alias) => (
              <li
                key={alias}
                className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded border border-slate-700"
              >
                <span className="text-white font-mono text-sm">{alias}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(alias)}
                  disabled={deleting === alias}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                >
                  {deleting === alias ? 'Removing…' : 'Remove'}
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
