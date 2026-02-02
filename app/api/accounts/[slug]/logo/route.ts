import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.jfif', '.png', '.gif', '.webp', '.svg']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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

    // Validate file type - check both extension and MIME type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const hasValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension)
    const hasValidMimeType = ALLOWED_IMAGE_TYPES.includes(file.type)
    
    // Accept file if either extension OR MIME type is valid (some files like .jfif have valid MIME types)
    if (!hasValidExtension && !hasValidMimeType) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}, or valid image MIME types` },
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

    // Upload to Supabase Storage (use account-logos bucket, fallback to datasets if not exists)
    const bucketName = 'account-logos'
    
    // Try to upload to account-logos bucket
    let uploadData, uploadError
    try {
      const result = await supabase.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        })
      uploadData = result.data
      uploadError = result.error
    } catch (error) {
      // If bucket doesn't exist, we'll handle it below
      uploadError = error as Error
    }

    if (uploadError) {
      // If bucket doesn't exist, try creating it or use datasets bucket as fallback
      console.warn('Upload to account-logos bucket failed, trying datasets bucket:', uploadError)
      
      // Try datasets bucket as fallback
      const fallbackResult = await supabase.storage
        .from('datasets')
        .upload(`logos/${storagePath}`, buffer, {
          contentType: file.type,
          upsert: false,
        })
      
      if (fallbackResult.error) {
        console.error('Storage upload error:', fallbackResult.error)
        return NextResponse.json(
          { error: 'Failed to upload logo' },
          { status: 500 }
        )
      }
      
      // Get public URL from fallback bucket
      const { data: urlData } = supabase.storage
        .from('datasets')
        .getPublicUrl(`logos/${storagePath}`)
      
      return NextResponse.json({ 
        logo_url: urlData.publicUrl 
      }, { status: 200 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath)

    return NextResponse.json({ 
      logo_url: urlData.publicUrl 
    }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
