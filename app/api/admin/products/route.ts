import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CATEGORIES = ['Construction', 'Cloud', 'Desktop'] as const

function normalizeProductKey(value: string): string {
  return value.trim().toLowerCase()
}

/** GET /api/admin/products – list products with alias counts. ?for_dashboard=1 for dashboard metadata. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forDashboard = searchParams.get('for_dashboard') === '1'
    const supabase = await createClient()

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('product_key, canonical_name, category, color, logo_url, sort_order')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('canonical_name', { ascending: true })

    if (productsError) {
      console.error('Products fetch error:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const list = products ?? []

    if (list.length === 0) {
      return NextResponse.json(forDashboard ? { products: [], displayNames: {}, colors: {} } : [])
    }

    const { data: aliasCounts } = await supabase
      .from('product_aliases')
      .select('product_key')

    const countByKey = new Map<string, number>()
    aliasCounts?.forEach((r) => {
      countByKey.set(r.product_key, (countByKey.get(r.product_key) ?? 0) + 1)
    })

    if (forDashboard) {
      const productsList = list.map((p) => ({
        ...p,
        alias_count: countByKey.get(p.product_key) ?? 0,
      }))
      const displayNames: Record<string, string> = {}
      const colors: Record<string, string> = {}
      productsList.forEach((p) => {
        displayNames[p.product_key] = p.canonical_name
        if (p.color) colors[p.product_key] = p.color
      })
      return NextResponse.json({
        products: productsList,
        displayNames,
        colors,
      })
    }

    const result = list.map((p) => ({
      ...p,
      alias_count: countByKey.get(p.product_key) ?? 0,
    }))
    return NextResponse.json(result)
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/admin/products – create product. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { product_key: rawKey, canonical_name, category, color, sort_order } = body

    const product_key = typeof rawKey === 'string' ? normalizeProductKey(rawKey) : ''
    if (!product_key) {
      return NextResponse.json({ error: 'product_key is required' }, { status: 400 })
    }
    if (!canonical_name || typeof canonical_name !== 'string' || !canonical_name.trim()) {
      return NextResponse.json({ error: 'canonical_name is required' }, { status: 400 })
    }
    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('products')
      .select('product_key')
      .eq('product_key', product_key)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A product with this product_key already exists' }, { status: 409 })
    }

    const insert: Record<string, unknown> = {
      product_key,
      canonical_name: canonical_name.trim(),
      category,
      sort_order: typeof sort_order === 'number' && Number.isFinite(sort_order) ? sort_order : 0,
    }
    if (typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color.trim())) {
      insert.color = color.trim()
    } else if (color === null || color === undefined) {
      insert.color = null
    }

    const { data: created, error } = await supabase.from('products').insert(insert).select().single()

    if (error) {
      console.error('Product create error:', error)
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
