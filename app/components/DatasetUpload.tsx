'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface DatasetUploadProps {
  accountSlug: string
  onUploadComplete?: () => void
}

export default function DatasetUpload({ accountSlug, onUploadComplete }: DatasetUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx']

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
    if (file.size > 100 * 1024 * 1024) {
      return 'File too large. Maximum size: 100MB'
    }
    return null
  }

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress (since fetch doesn't support upload progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`/api/accounts/${accountSlug}/datasets/upload`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const dataset = await response.json()
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Refresh the page to show new dataset
      if (onUploadComplete) {
        onUploadComplete()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
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
    <div className="space-y-4">
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
          accept=".csv,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="text-hello-yellow">Uploading...</div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-hello-yellow h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-sm text-slate-400">{uploadProgress}%</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl mb-2">📁</div>
            <div className="text-white font-medium">
              Drag and drop a file here, or click to select
            </div>
            <div className="text-sm text-slate-400">
              Supported formats: CSV, XLS, XLSX (max 100MB)
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
