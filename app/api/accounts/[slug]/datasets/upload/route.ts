import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { detectDatasetType } from '@/lib/ingest/detector'

const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch account by slug
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${account.id}/${timestamp}-${sanitizedFilename}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('datasets')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Auto-detect dataset type
    let datasetType = 'manual_adjustments' // Default fallback
    let detectedHeaders: string[] | null = null

    try {
      const detection = await detectDatasetType(buffer, file.name)
      if (detection) {
        datasetType = detection.type
        detectedHeaders = detection.headers
      }
    } catch (error) {
      console.warn('Dataset type detection failed:', error)
      // Continue with default type
    }

    // Create dataset record
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .insert({
        account_id: account.id,
        dataset_type: datasetType,
        original_filename: file.name,
        storage_path: storagePath,
        status: 'queued',
        detected_headers: detectedHeaders,
      })
      .select()
      .single()

    if (datasetError) {
      console.error('Dataset creation error:', datasetError)
      // Try to clean up uploaded file
      await supabase.storage.from('datasets').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create dataset record' },
        { status: 500 }
      )
    }

    return NextResponse.json(dataset, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
