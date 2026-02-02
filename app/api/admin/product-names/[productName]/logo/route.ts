import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

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

function decodeProductName(param: string): string {
  try {
    return decodeURIComponent(param)
  } catch {
    return param
  }
}

function storageSegment(productName: string): string {
  const hash = createHash('sha256').update(productName, 'utf8').digest('hex').slice(0, 16)
  return `pn/${hash}`
}

/** POST /api/admin/product-names/[productName]/logo – upload logo, overwrite existing. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productName: string }> }
) {
  try {
    const { productName: encoded } = await params
    const productName = decodeProductName(encoded)
    if (!productName) {
      return NextResponse.json({ error: 'product_name is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: row } = await supabase
      .from('product_names')
      .select('product_name')
      .eq('product_name', productName)
      .single()

    if (!row) {
      return NextResponse.json({ error: 'Product name not found' }, { status: 404 })
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

    const segment = storageSegment(productName)
    const storagePath = `${segment}/logo`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) {
      console.error('Product name logo upload error:', uploadErr)
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const logo_url = urlData.publicUrl

    const { error: updateErr } = await supabase
      .from('product_names')
      .update({ logo_url })
      .eq('product_name', productName)

    if (updateErr) {
      console.error('Product name logo_url update error:', updateErr)
      return NextResponse.json({ error: 'Failed to update logo' }, { status: 500 })
    }

    return NextResponse.json({ logo_url })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/admin/product-names/[productName]/logo – clear logo_url. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productName: string }> }
) {
  try {
    const { productName: encoded } = await params
    const productName = decodeProductName(encoded)
    if (!productName) {
      return NextResponse.json({ error: 'product_name is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: row } = await supabase
      .from('product_names')
      .select('product_name')
      .eq('product_name', productName)
      .single()

    if (!row) {
      return NextResponse.json({ error: 'Product name not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('product_names')
      .update({ logo_url: null })
      .eq('product_name', productName)

    if (error) {
      console.error('Product name logo clear error:', error)
      return NextResponse.json({ error: 'Failed to clear logo' }, { status: 500 })
    }

    return NextResponse.json({ logo_url: null })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
