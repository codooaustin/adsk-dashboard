import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { detectDatasetType } from '@/lib/ingest/detector'

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * Step 1: Request a signed upload URL (no file in body – avoids Vercel 4.5MB limit).
 * Body: { filename: string, contentType?: string, size: number }
 * Returns: { uploadUrl, path, token } for client to upload directly to Supabase Storage.
 */
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

    const body = await request.json().catch(() => null)
    if (!body || typeof body.filename !== 'string') {
      return NextResponse.json(
        { error: 'Request body must include filename' },
        { status: 400 }
      )
    }

    const filename = body.filename
    const size = typeof body.size === 'number' ? body.size : 0
    const fileExtension = '.' + filename.split('.').pop()?.toLowerCase()

    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${account.id}/${timestamp}-${sanitizedFilename}`

    const admin = createAdminClient()
    const { data: signed, error: signedError } = await admin.storage
      .from('datasets')
      .createSignedUploadUrl(storagePath)

    if (signedError || !signed?.token || !signed?.path) {
      console.error('Signed upload URL error:', signedError)
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      )
    }

    const uploadUrl =
      (signed as { signedUrl?: string; uploadUrl?: string }).signedUrl ??
      (signed as { signedUrl?: string; uploadUrl?: string }).uploadUrl
    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      uploadUrl,
      path: signed.path,
      token: signed.token,
      storagePath,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
