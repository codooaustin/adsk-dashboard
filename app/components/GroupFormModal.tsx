'use client'

import { useState, useEffect } from 'react'

export interface ProductGroupRow {
  id: string
  name: string
  sort_order: number
  product_keys: string[]
  member_count: number
}

interface GroupFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  group: ProductGroupRow | null
}

export default function GroupFormModal({
  isOpen,
  onClose,
  onSuccess,
  group,
}: GroupFormModalProps) {
  const isEdit = !!group
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name)
        setSortOrder(group.sort_order ?? 0)
      } else {
        setName('')
        setSortOrder(0)
      }
    }
  }, [isOpen, group])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      if (isEdit) {
        const res = await fetch(`/api/admin/product-groups/${group.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), sort_order: sortOrder }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? 'Failed to update group')
        }
      } else {
        const res = await fetch('/api/admin/product-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), sort_order: sortOrder }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? 'Failed to create group')
        }
      }
      onSuccess()
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {isEdit ? 'Edit Group' : 'Add Group'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="group_name" className="block text-sm font-medium text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="group_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
              placeholder="e.g. Revit Suite"
            />
          </div>
          <div>
            <label htmlFor="group_sort" className="block text-sm font-medium text-slate-300 mb-1">
              Sort order
            </label>
            <input
              type="number"
              id="group_sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
