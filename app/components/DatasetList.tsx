'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Dataset {
  id: string
  dataset_type: string
  original_filename: string
  uploaded_at: string
  status: 'queued' | 'processed' | 'failed'
  min_date?: string | null
  max_date?: string | null
  row_count?: number | null
  error_message?: string | null
}

interface DatasetListProps {
  datasets: Dataset[]
  accountSlug: string
}

export default function DatasetList({ datasets, accountSlug }: DatasetListProps) {
  const router = useRouter()
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const handleProcess = async (dataset: Dataset) => {
    if (dataset.status !== 'queued') {
      return
    }

    setProcessingIds((prev) => new Set(prev).add(dataset.id))

    try {
      // Set a longer timeout for large files (5 minutes)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

      const response = await fetch(`/api/datasets/${dataset.id}/process`, {
        method: 'POST',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json()
        const errorMessage = error.error || error.details || 'Failed to process dataset'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // Refresh the page to show updated status
      router.refresh()
      
      // Show success message if we got result data
      if (result.rowsInserted) {
        console.log(`Successfully processed ${result.rowsInserted} rows`)
      }
    } catch (error) {
      console.error('Error processing dataset:', error)
      let errorMessage = 'Failed to process dataset'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Processing timed out. The file may be very large. Please check the dataset status.'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(errorMessage)
      
      // Refresh to show any error status that was set
      router.refresh()
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(dataset.id)
        return next
      })
    }
  }

  const handleDelete = async (dataset: Dataset) => {
    const ok = window.confirm(
      'Delete this dataset? This will remove the file and all associated usage data. This cannot be undone.'
    )
    if (!ok) return

    setDeletingIds((prev) => new Set(prev).add(dataset.id))
    try {
      const response = await fetch(
        `/api/accounts/${accountSlug}/datasets/${dataset.id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const msg = err.error || err.details || 'Failed to delete dataset'
        alert(msg)
        return
      }
      router.refresh()
    } catch (e) {
      console.error('Delete error:', e)
      alert('Failed to delete dataset')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(dataset.id)
        return next
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format date-only strings (YYYY-MM-DD) without timezone conversion
  const formatDateOnly = (dateString: string) => {
    // If it's already in YYYY-MM-DD format, parse it as local date to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day) // Month is 0-indexed
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
    // Fallback for other formats
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded text-xs font-medium'
    switch (status) {
      case 'processed':
        return `${baseClasses} bg-green-900/30 text-green-400 border border-green-700`
      case 'failed':
        return `${baseClasses} bg-red-900/30 text-red-400 border border-red-700`
      case 'queued':
      default:
        return `${baseClasses} bg-yellow-900/30 text-yellow-400 border border-yellow-700`
    }
  }

  const formatDatasetType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (datasets.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No datasets uploaded yet.</p>
        <p className="text-sm text-slate-500 mt-2">
          Upload your first dataset to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {datasets.map((dataset) => (
        <div
          key={dataset.id}
          className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-white font-medium">{dataset.original_filename}</h3>
                <span className={getStatusBadge(dataset.status)}>
                  {dataset.status}
                </span>
              </div>
              <div className="text-sm text-slate-400 space-y-1">
                <div>Type: {formatDatasetType(dataset.dataset_type)}</div>
                <div>Uploaded: {formatDate(dataset.uploaded_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {dataset.status === 'queued' && (
                <button
                  onClick={() => handleProcess(dataset)}
                  disabled={processingIds.has(dataset.id)}
                  className="px-4 py-2 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingIds.has(dataset.id) ? 'Processing...' : 'Process'}
                </button>
              )}
              <button
                onClick={() => handleDelete(dataset)}
                disabled={processingIds.has(dataset.id) || deletingIds.has(dataset.id)}
                className="px-4 py-2 border border-red-500 text-red-400 rounded hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingIds.has(dataset.id) ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          {dataset.status === 'processed' && (
            <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400 space-y-1">
              {dataset.min_date && dataset.max_date && (
                <div>
                  Date range: {formatDateOnly(dataset.min_date)} -{' '}
                  {formatDateOnly(dataset.max_date)}
                </div>
              )}
              {dataset.row_count != null && (
                <div>Rows: {dataset.row_count.toLocaleString()}</div>
              )}
            </div>
          )}

          {dataset.status === 'failed' && dataset.error_message && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-700">
                Error: {dataset.error_message}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
