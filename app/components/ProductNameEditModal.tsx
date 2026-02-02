'use client'

import { useState, useEffect } from 'react'

export interface ProductNameRow {
  product_name: string
  display_label: string | null
  tag: string | null
  color: string | null
  logo_url: string | null
}

interface ProductNameEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  row: ProductNameRow | null
  /** All rows (for "choose from existing" logos). Excludes current row when picking. */
  allRows?: ProductNameRow[]
}

export default function ProductNameEditModal({
  isOpen,
  onClose,
  onSuccess,
  row,
  allRows = [],
}: ProductNameEditModalProps) {
  const [displayLabel, setDisplayLabel] = useState('')
  const [tag, setTag] = useState('')
  const [color, setColor] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [chosenLogoUrl, setChosenLogoUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const existingLogos = allRows.filter(
    (r) => r.logo_url && r.product_name !== row?.product_name
  ) as { product_name: string; logo_url: string }[]

  useEffect(() => {
    if (isOpen && row) {
      setDisplayLabel(row.display_label ?? '')
      setTag(row.tag ?? '')
      setColor(row.color ?? '')
      setLogoPreview(row.logo_url ?? null)
      setLogoFile(null)
      setLogoRemoved(false)
      setChosenLogoUrl(null)
    }
  }, [isOpen, row])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoRemoved(false)
      setChosenLogoUrl(null)
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoRemoved(true)
    setChosenLogoUrl(null)
  }

  const handleChooseExisting = (logoUrl: string) => {
    setLogoFile(null)
    setLogoRemoved(false)
    setChosenLogoUrl(logoUrl)
    setLogoPreview(logoUrl)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!row) return
    setIsSubmitting(true)
    const base = {
      display_label: displayLabel.trim() || null,
      tag: tag.trim() || null,
      color: color.trim() || null,
    }
    try {
      let logo_url: string | null | undefined = undefined
      if (logoRemoved) {
        const del = await fetch(
          `/api/admin/product-names/${encodeURIComponent(row.product_name)}/logo`,
          { method: 'DELETE' }
        )
        if (!del.ok) throw new Error('Failed to clear logo')
        logo_url = null
      } else if (logoFile) {
        const fd = new FormData()
        fd.append('file', logoFile)
        const up = await fetch(
          `/api/admin/product-names/${encodeURIComponent(row.product_name)}/logo`,
          { method: 'POST', body: fd }
        )
        if (!up.ok) {
          const err = await up.json().catch(() => ({}))
          throw new Error(err.error ?? 'Failed to upload logo')
        }
        const { logo_url: u } = await up.json()
        logo_url = u
      } else if (chosenLogoUrl) {
        logo_url = chosenLogoUrl
      }

      const res = await fetch(
        `/api/admin/product-names/${encodeURIComponent(row.product_name)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            logo_url !== undefined ? { ...base, logo_url } : base
          ),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to update')
      }
      onSuccess()
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Edit product name</h2>
        {row && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Product name (read-only)
              </label>
              <div className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300 font-mono text-sm">
                {row.product_name}
              </div>
            </div>
            <div>
              <label htmlFor="display_label" className="block text-sm font-medium text-slate-300 mb-1">
                Display label
              </label>
              <input
                id="display_label"
                type="text"
                value={displayLabel}
                onChange={(e) => setDisplayLabel(e.target.value)}
                placeholder="Leave empty to use product name"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:ring-2 focus:ring-hello-yellow focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="tag" className="block text-sm font-medium text-slate-300 mb-1">
                Tag (for grouping)
              </label>
              <input
                id="tag"
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Leave empty for ungrouped"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:ring-2 focus:ring-hello-yellow focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-slate-300 mb-1">
                Color (hex)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="color_picker"
                  value={color || '#3b82f6'}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-slate-600 bg-slate-800"
                />
                <input
                  type="text"
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:ring-2 focus:ring-hello-yellow focus:border-transparent font-mono"
                />
              </div>
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
                  <div className="flex flex-wrap gap-2">
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
                  {existingLogos.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Or choose from existing:</p>
                      <div className="flex flex-wrap gap-2">
                        {existingLogos.map((r) => (
                          <button
                            key={r.product_name}
                            type="button"
                            onClick={() => handleChooseExisting(r.logo_url)}
                            className="flex flex-col items-center gap-0.5 p-1.5 rounded border border-slate-600 hover:border-hello-yellow hover:bg-slate-800 transition-colors"
                          >
                            <img src={r.logo_url} alt="" className="h-10 w-10 object-contain" />
                            <span className="text-xs text-slate-400 max-w-[72px] truncate" title={r.product_name}>
                              {r.product_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-hello-yellow focus:border-transparent file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-white"
                  />
                  {existingLogos.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Or choose from existing:</p>
                      <div className="flex flex-wrap gap-2">
                        {existingLogos.map((r) => (
                          <button
                            key={r.product_name}
                            type="button"
                            onClick={() => handleChooseExisting(r.logo_url)}
                            className="flex flex-col items-center gap-0.5 p-1.5 rounded border border-slate-600 hover:border-hello-yellow hover:bg-slate-800 transition-colors"
                          >
                            <img src={r.logo_url} alt="" className="h-10 w-10 object-contain" />
                            <span className="text-xs text-slate-400 max-w-[72px] truncate" title={r.product_name}>
                              {r.product_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, GIF, WebP, or SVG (max 5MB)</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
