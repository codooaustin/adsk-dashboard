'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import CorporateAccountMapping from '@/app/components/CorporateAccountMapping'

export default function QuotaAttainmentUploadPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [uploadData, setUploadData] = useState<{
    row_count: number
    commission_months: string[]
    corporate_account_names: string[]
    unmapped_names: string[]
    mapped_names: string[]
  } | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileUpload = async (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!['.xlsx', '.xls', '.csv'].includes(extension)) {
      setError('Invalid file type. Only Excel or CSV files (.xlsx, .xls, .csv) are allowed.')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size: 50MB')
      return
    }

    setError(null)
    setSuccess(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/quota-attainment/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const data = await response.json()
      setUploadId(data.upload_id)
      setUploadData(data)

      // Fetch existing mappings to populate the mappings state
      try {
        const mappingsResponse = await fetch('/api/corporate-account-mappings')
        if (mappingsResponse.ok) {
          const existingMappings = await mappingsResponse.json()
          // Only include mappings for Corporate Account Names in this file
          const relevantMappings: Record<string, string> = {}
          for (const name of data.corporate_account_names) {
            if (existingMappings[name]) {
              relevantMappings[name] = existingMappings[name]
            }
          }
          setMappings(relevantMappings)
        }
      } catch (error) {
        console.error('Error fetching existing mappings:', error)
        // Continue with empty mappings
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleProcessUpload = async () => {
    if (!uploadId) {
      setError('No upload to process')
      return
    }

    // Validate that all Corporate Account Names are mapped
    if (uploadData) {
      const unmapped = uploadData.corporate_account_names.filter(
        (name) => !mappings[name] || mappings[name] === ''
      )
      if (unmapped.length > 0) {
        setError(`Please map all Corporate Account Names. ${unmapped.length} unmapped: ${unmapped.slice(0, 3).join(', ')}${unmapped.length > 3 ? '...' : ''}`)
        return
      }
    }

    setError(null)
    setSuccess(null)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/quota-attainment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: uploadId,
          mappings: mappings,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process upload')
      }

      const data = await response.json()
      setSuccess(
        `Successfully processed ${data.inserted_count} transactions for ${data.commission_months.length} commission month(s).`
      )

      // Reset form after a delay
      setTimeout(() => {
        setUploadId(null)
        setUploadData(null)
        setMappings({})
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        router.refresh()
      }, 3000)
    } catch (error) {
      console.error('Process error:', error)
      setError(error instanceof Error ? error.message : 'Failed to process upload')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Upload Quota Attainment</h1>
        <p className="text-slate-400">
          Upload an Excel spreadsheet containing quota attainment transactions
        </p>
      </div>

      <div className="space-y-8">
        {/* File Upload Section */}
        {!uploadId && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Upload Excel File</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${
                  isDragging
                    ? 'border-hello-yellow bg-hello-yellow/10'
                    : 'border-slate-700 hover:border-slate-600'
                }
                ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
              `}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />

              {isUploading ? (
                <div className="space-y-2">
                  <div className="text-hello-yellow">Uploading...</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-white font-medium">
                    Drag and drop an Excel file here, or click to select
                  </div>
              <div className="text-sm text-slate-400">
                Supported formats: XLSX, XLS, CSV (max 50MB)
              </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Mapping Section */}
        {uploadId && uploadData && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">Map Corporate Account Names</h2>
              <div className="text-sm text-slate-400 space-y-1">
                <p>File contains {uploadData.row_count} transactions</p>
                <p>
                  Commission months: {uploadData.commission_months.join(', ')}
                </p>
                <p>
                  {uploadData.unmapped_names.length} unmapped, {uploadData.mapped_names.length}{' '}
                  already mapped
                </p>
              </div>
            </div>

            <CorporateAccountMapping
              corporateAccountNames={uploadData.corporate_account_names}
              existingMappings={mappings}
              onMappingsChange={setMappings}
            />

            <div className="mt-6 flex gap-4">
              <button
                onClick={handleProcessUpload}
                disabled={
                  isProcessing ||
                  uploadData.corporate_account_names.some(
                    (name) => !mappings[name] || mappings[name] === ''
                  )
                }
                className="px-6 py-3 bg-hello-yellow text-black font-medium rounded hover:bg-hello-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Process Upload'}
              </button>
              <button
                onClick={() => {
                  setUploadId(null)
                  setUploadData(null)
                  setMappings({})
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                disabled={isProcessing}
                className="px-6 py-3 bg-slate-700 text-white font-medium rounded hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded text-red-400">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded text-green-400">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}
