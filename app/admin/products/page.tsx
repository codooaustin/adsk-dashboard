'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProductNameEditModal, {
  type ProductNameRow,
} from '@/app/components/ProductNameEditModal'

export default function ProductsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ProductNameRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<ProductNameRow | null>(null)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/product-names')
      if (res.ok) {
        const data = await res.json()
        setRows(Array.isArray(data) ? data : [])
      } else {
        setRows([])
      }
    } catch {
      setRows([])
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchRows().finally(() => setLoading(false))
  }, [fetchRows])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/product-names/sync', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Sync failed')
      }
      const { added, already_existing } = await res.json()
      await fetchRows()
      router.refresh()
      alert(`Sync complete. Added: ${added}, already existing: ${already_existing}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleEdit = (r: ProductNameRow) => {
    setEditingRow(r)
    setEditOpen(true)
  }

  const handleEditSuccess = () => {
    fetchRows()
    router.refresh()
  }

  const handleDelete = async (r: ProductNameRow) => {
    const ok = window.confirm(
      `Remove "${r.product_name}" from the product names catalog? This does not change raw data.`
    )
    if (!ok) return
    setDeletingName(r.product_name)
    try {
      const res = await fetch(
        `/api/admin/product-names/${encodeURIComponent(r.product_name)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Delete failed')
      }
      await fetchRows()
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingName(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Product management</h1>
          <p className="text-slate-400 text-sm">
            Manage display labels and grouping tags for product names from raw data.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 disabled:opacity-50 transition-colors"
        >
          {syncing ? 'Syncing…' : 'Sync from raw'}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-lg text-center">
          <p className="text-slate-400 mb-4">No product names yet.</p>
          <p className="text-slate-500 text-sm mb-4">
            Run &quot;Sync from raw&quot; to discover product names from your raw tables.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync from raw'}
          </button>
        </div>
      ) : (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800/80">
              <tr>
                <th className="text-left text-slate-300 font-medium px-4 py-3">Product name</th>
                <th className="text-left text-slate-300 font-medium px-4 py-3">Display label</th>
                <th className="text-left text-slate-300 font-medium px-4 py-3">Tag</th>
                <th className="text-left text-slate-300 font-medium px-4 py-3">Color</th>
                <th className="text-left text-slate-300 font-medium px-4 py-3">Logo</th>
                <th className="text-right text-slate-300 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rows.map((r) => (
                <tr key={r.product_name} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-sm text-white">{r.product_name}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.display_label ?? <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.tag ?? <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.color ? (
                      <span
                        className="inline-block w-6 h-6 rounded border border-slate-600"
                        style={{ backgroundColor: r.color }}
                        title={r.color}
                      />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.logo_url ? (
                      <img
                        src={r.logo_url}
                        alt=""
                        className="h-8 w-8 object-contain rounded border border-slate-600"
                      />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(r)}
                        className="px-3 py-1 text-sm border border-slate-600 text-slate-300 rounded hover:bg-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingName === r.product_name}
                        className="px-3 py-1 text-sm border border-red-600 text-red-400 rounded hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {deletingName === r.product_name ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductNameEditModal
        isOpen={editOpen}
        onClose={() => { setEditOpen(false); setEditingRow(null) }}
        onSuccess={handleEditSuccess}
        row={editingRow}
        allRows={rows}
      />
    </div>
  )
}
