import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function decodeProductName(param: string): string {
  try {
    return decodeURIComponent(param)
  } catch {
    return param
  }
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

/** PATCH /api/admin/product-names/[productName] – update display_label, tag, and/or color. */
export async function PATCH(
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
    const body = await request.json().catch(() => ({}))
    const updates: { display_label?: string | null; tag?: string | null; color?: string | null; logo_url?: string | null } = {}

    if (Object.prototype.hasOwnProperty.call(body, 'display_label')) {
      const v = body.display_label
      updates.display_label = v === null || v === undefined || v === '' ? null : String(v).trim()
    }
    if (Object.prototype.hasOwnProperty.call(body, 'tag')) {
      const v = body.tag
      updates.tag = v === null || v === undefined || v === '' ? null : String(v).trim()
    }
    if (Object.prototype.hasOwnProperty.call(body, 'color')) {
      const v = body.color
      if (v === null || v === undefined || v === '') {
        updates.color = null
      } else if (typeof v === 'string' && HEX_COLOR.test(v.trim())) {
        updates.color = v.trim()
      } else {
        return NextResponse.json({ error: 'color must be #rrggbb or null' }, { status: 400 })
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'logo_url')) {
      const v = body.logo_url
      updates.logo_url = v === null || v === undefined || v === '' ? null : String(v).trim()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided (display_label, tag, color, logo_url)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('product_names')
      .update(updates)
      .eq('product_name', productName)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product name not found' }, { status: 404 })
      }
      console.error('Product name update error:', error)
      return NextResponse.json({ error: 'Failed to update product name' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/admin/product-names/[productName] – remove row from product_names only (catalog). */
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
    const { error } = await supabase
      .from('product_names')
      .delete()
      .eq('product_name', productName)

    if (error) {
      console.error('Product name delete error:', error)
      return NextResponse.json({ error: 'Failed to delete product name' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
