import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** GET /api/admin/product-groups – list groups with member count and product_keys */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: groups, error } = await supabase
      .from('product_groups')
      .select('id, name, sort_order')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name')

    if (error) {
      console.error('Product groups fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch product groups' }, { status: 500 })
    }

    const list = groups ?? []
    const { data: members } = await supabase.from('product_group_members').select('group_id, product_key')

    const byGroup = new Map<string, string[]>()
    members?.forEach((m) => {
      const arr = byGroup.get(m.group_id) ?? []
      arr.push(m.product_key)
      byGroup.set(m.group_id, arr)
    })

    const result = list.map((g) => ({
      ...g,
      product_keys: byGroup.get(g.id) ?? [],
      member_count: (byGroup.get(g.id) ?? []).length,
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/admin/product-groups – create group. Body: { name: string, sort_order?: number } */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { name, sort_order } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const insert: Record<string, unknown> = {
      name: name.trim(),
      sort_order: typeof sort_order === 'number' && Number.isFinite(sort_order) ? sort_order : 0,
    }

    const { data: created, error } = await supabase
      .from('product_groups')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('Product group create error:', error)
      return NextResponse.json({ error: 'Failed to create product group' }, { status: 500 })
    }

    return NextResponse.json({ ...created, product_keys: [], member_count: 0 }, { status: 201 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
