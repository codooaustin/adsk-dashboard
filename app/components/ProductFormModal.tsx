'use client'

import { useState, useEffect } from 'react'

const CATEGORIES = ['Construction', 'Cloud', 'Desktop'] as const

export interface ProductFormValues {
  product_key: string
  canonical_name: string
  category: string
  color: string
  sort_order: number
}

export interface ProductRow {
  product_key: string
  canonical_name: string
  category: string
  color: string | null
  logo_url: string | null
  sort_order: number
  alias_count?: number
}

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product: ProductRow | null
}

export default function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductFormModalProps) {
  const isEdit = !!product
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ProductFormValues>({
    product_key: '',
    canonical_name: '',
    category: 'Desktop',
    color: '',
    sort_order: 0,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          product_key: product.product_key,
          canonical_name: product.canonical_name,
          category: product.category,
          color: product.color ?? '',
          sort_order: product.sort_order ?? 0,
        })
        setLogoPreview(product.logo_url ?? null)
      } else {
        setFormData({
          product_key: '',
          canonical_name: '',
          category: 'Desktop',
          color: '',
          sort_order: 0,
        })
        setLogoPreview(null)
      }
      setLogoFile(null)
      setLogoRemoved(false)
    }
  }, [isOpen, product])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoRemoved(false)
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoRemoved(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        canonical_name: formData.canonical_name.trim(),
        category: formData.category,
        color: formData.color.trim() || null,
        sort_order: formData.sort_order,
      }
      const key = formData.product_key.trim().toLowerCase()

      if (isEdit) {
        if (logoRemoved && product?.logo_url) {
          const del = await fetch(`/api/admin/products/${encodeURIComponent(key)}/logo`, {
            method: 'DELETE',
          })
          if (!del.ok) throw new Error('Failed to clear logo')
        } else if (logoFile) {
          const fd = new FormData()
          fd.append('file', logoFile)
          const up = await fetch(`/api/admin/products/${encodeURIComponent(key)}/logo`, {
            method: 'POST',
            body: fd,
          })
          if (!up.ok) {
            const err = await up.json().catch(() => ({}))
            throw new Error(err.error ?? 'Failed to upload logo')
          }
        }

        const res = await fetch(`/api/admin/products/${encodeURIComponent(key)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? 'Failed to update product')
        }
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, product_key: key }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? 'Failed to create product')
        }
        if (logoFile) {
          const fd = new FormData()
          fd.append('file', logoFile)
          const up = await fetch(`/api/admin/products/${encodeURIComponent(key)}/logo`, {
            method: 'POST',
            body: fd,
          })
          if (!up.ok) {
            const err = await up.json().catch(() => ({}))
            throw new Error(err.error ?? 'Failed to upload logo')
          }
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
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="product_key" className="block text-sm font-medium text-slate-300 mb-1">
              Product key *
            </label>
            <input
              type="text"
              id="product_key"
              required
              value={formData.product_key}
              onChange={(e) => setFormData({ ...formData, product_key: e.target.value })}
              readOnly={isEdit}
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="e.g. revit"
            />
            {isEdit && (
              <p className="text-xs text-slate-500 mt-1">Product key cannot be changed.</p>
            )}
          </div>

          <div>
            <label htmlFor="canonical_name" className="block text-sm font-medium text-slate-300 mb-1">
              Display name *
            </label>
            <input
              type="text"
              id="canonical_name"
              required
              value={formData.canonical_name}
              onChange={(e) => setFormData({ ...formData, canonical_name: e.target.value })}
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
              placeholder="e.g. Revit"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as (typeof CATEGORIES)[number] })
              }
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-slate-300 mb-1">
              Color (hex)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                id="color_picker"
                value={formData.color || '#3b82f6'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-slate-700 bg-black"
              />
              <input
                type="text"
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow font-mono"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sort_order" className="block text-sm font-medium text-slate-300 mb-1">
              Sort order
            </label>
            <input
              type="number"
              id="sort_order"
              value={formData.sort_order}
              onChange={(e) =>
                setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white focus:outline-none focus:border-hello-yellow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Logo</label>
            {logoPreview ? (
              <div className="space-y-2">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-24 max-w-24 object-contain bg-slate-800 p-2 rounded border border-slate-700"
                />
                <div className="flex gap-2">
                  <label className="px-3 py-1 bg-slate-700 text-white text-sm font-medium rounded hover:bg-slate-600 cursor-pointer">
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
                    className="px-3 py-1 bg-red-900/80 text-red-200 text-sm font-medium rounded hover:bg-red-900"
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
                className="w-full px-3 py-2 bg-black border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-hello-yellow file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-white"
              />
            )}
            <p className="text-xs text-slate-500 mt-1">JPG, PNG, GIF, WebP, or SVG (max 5MB)</p>
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
              disabled={isSubmitting}
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
