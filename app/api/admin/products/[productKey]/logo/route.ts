import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET = 'product-logos'
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.jfif', '.png', '.gif', '.webp', '.svg']
const MAX_FILE_SIZE = 5 * 1024 * 1024

function safePathSegment(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/** POST /api/admin/products/[productKey]/logo – upload logo, overwrite existing. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productKey: string }> }
) {
  try {
    const { productKey } = await params
    const key = decodeURIComponent(productKey)
    const supabase = await createClient()

    const { data: product } = await supabase
      .from('products')
      .select('product_key, logo_url')
      .eq('product_key', key)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    const validExt = ALLOWED_EXTENSIONS.includes(ext)
    const validMime = ALLOWED_IMAGE_TYPES.includes(file.type)
    if (!validExt && !validMime) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    const segment = safePathSegment(key)
    const storagePath = `${segment}/logo`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) {
      console.error('Product logo upload error:', uploadErr)
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const logo_url = urlData.publicUrl

    const { error: updateErr } = await supabase
      .from('products')
      .update({ logo_url })
      .eq('product_key', key)

    if (updateErr) {
      console.error('Product logo_url update error:', updateErr)
      return NextResponse.json({ error: 'Failed to update product logo' }, { status: 500 })
    }

    return NextResponse.json({ logo_url })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/admin/products/[productKey]/logo – clear logo_url. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productKey: string }> }
) {
  try {
    const { productKey } = await params
    const key = decodeURIComponent(productKey)
    const supabase = await createClient()

    const { data: product } = await supabase
      .from('products')
      .select('product_key')
      .eq('product_key', key)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('products')
      .update({ logo_url: null })
      .eq('product_key', key)

    if (error) {
      console.error('Product logo clear error:', error)
      return NextResponse.json({ error: 'Failed to clear logo' }, { status: 500 })
    }

    return NextResponse.json({ logo_url: null })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
