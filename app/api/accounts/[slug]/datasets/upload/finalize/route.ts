import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { detectDatasetType } from '@/lib/ingest/detector'

/**
 * Step 2: After client uploads file to signed URL, call this to create the dataset record.
 * Body: { storagePath: string, originalFilename: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

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

    const body = await request.json().catch(() => null)
    if (!body || typeof body.storagePath !== 'string' || typeof body.originalFilename !== 'string') {
      return NextResponse.json(
        { error: 'Request body must include storagePath and originalFilename' },
        { status: 400 }
      )
    }

    const { storagePath, originalFilename } = body

    // Ensure path is under this account
    if (!storagePath.startsWith(`${account.id}/`)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
    }

    // Download file from storage to run type detection (server-side, no Vercel body limit)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(storagePath)

    if (downloadError || !fileData) {
      console.error('Finalize download error:', downloadError)
      return NextResponse.json(
        { error: 'File not found in storage. Upload may have failed.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let datasetType = 'manual_adjustments'
    let detectedHeaders: string[] | null = null
    try {
      const detection = await detectDatasetType(buffer, originalFilename)
      if (detection) {
        datasetType = detection.type
        detectedHeaders = detection.headers
      }
    } catch (error) {
      console.warn('Dataset type detection failed:', error)
    }

    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .insert({
        account_id: account.id,
        dataset_type: datasetType,
        original_filename: originalFilename,
        storage_path: storagePath,
        status: 'queued',
        detected_headers: detectedHeaders,
      })
      .select()
      .single()

    if (datasetError) {
      console.error('Dataset creation error:', datasetError)
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
