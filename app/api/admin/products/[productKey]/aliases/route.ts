import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase()
}

/** GET /api/admin/products/[productKey]/aliases */
export async function GET(
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

    const { data: aliases, error } = await supabase
      .from('product_aliases')
      .select('alias')
      .eq('product_key', key)
      .order('alias')

    if (error) {
      console.error('Aliases fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch aliases' }, { status: 500 })
    }

    return NextResponse.json(aliases ?? [])
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/admin/products/[productKey]/aliases – body: { alias: string } */
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
      .select('product_key')
      .eq('product_key', key)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await request.json()
    const raw = body?.alias
    if (typeof raw !== 'string' || !raw.trim()) {
      return NextResponse.json({ error: 'alias is required' }, { status: 400 })
    }

    const alias = normalizeAlias(raw)

    const { data: existing } = await supabase
      .from('product_aliases')
      .select('alias, product_key')
      .eq('alias', alias)
      .single()

    if (existing) {
      if (existing.product_key === key) {
        return NextResponse.json({ error: 'This alias is already assigned to this product' }, { status: 409 })
      }
      return NextResponse.json({ error: 'This alias is already assigned to another product' }, { status: 409 })
    }

    const { error: insertError } = await supabase.from('product_aliases').insert({ alias, product_key: key })

    if (insertError) {
      console.error('Alias insert error:', insertError)
      return NextResponse.json({ error: 'Failed to add alias' }, { status: 500 })
    }

    return NextResponse.json({ alias, product_key: key }, { status: 201 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
