import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CATEGORIES = ['Construction', 'Cloud', 'Desktop'] as const

/** GET /api/admin/products/[productKey] */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productKey: string }> }
) {
  try {
    const { productKey } = await params
    const key = decodeURIComponent(productKey)
    const supabase = await createClient()

    const { data: product, error } = await supabase
      .from('products')
      .select('product_key, canonical_name, category, color, logo_url, sort_order')
      .eq('product_key', key)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: aliases } = await supabase
      .from('product_aliases')
      .select('alias')
      .eq('product_key', key)

    return NextResponse.json({
      ...product,
      alias_count: aliases?.length ?? 0,
    })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH /api/admin/products/[productKey] – update canonical_name, category, color, sort_order only. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productKey: string }> }
) {
  try {
    const { productKey } = await params
    const key = decodeURIComponent(productKey)
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('products')
      .select('product_key')
      .eq('product_key', key)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await request.json()
    const { canonical_name, category, color, sort_order } = body
    const update: Record<string, unknown> = {}

    if (canonical_name !== undefined) {
      if (!canonical_name || typeof canonical_name !== 'string' || !canonical_name.trim()) {
        return NextResponse.json({ error: 'canonical_name cannot be empty' }, { status: 400 })
      }
      update.canonical_name = canonical_name.trim()
    }
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: `category must be one of: ${CATEGORIES.join(', ')}` },
          { status: 400 }
        )
      }
      update.category = category
    }
    if (color !== undefined) {
      if (color === null || color === '') {
        update.color = null
      } else if (typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color.trim())) {
        update.color = color.trim()
      }
    }
    if (sort_order !== undefined) {
      update.sort_order =
        typeof sort_order === 'number' && Number.isFinite(sort_order) ? sort_order : 0
    }

    if (Object.keys(update).length === 0) {
      const { data: current } = await supabase
        .from('products')
        .select()
        .eq('product_key', key)
        .single()
      return NextResponse.json(current)
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update(update)
      .eq('product_key', key)
      .select()
      .single()

    if (error) {
      console.error('Product update error:', error)
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/admin/products/[productKey]. Block if usage_facts references product_key. */
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

    const { count } = await supabase
      .from('usage_facts')
      .select('*', { count: 'exact', head: true })
      .eq('product_key', key)

    if (count != null && count > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete product: it is referenced by usage data. Remove or reassign usage first.',
        },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase.from('products').delete().eq('product_key', key)

    if (deleteError) {
      console.error('Product delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
