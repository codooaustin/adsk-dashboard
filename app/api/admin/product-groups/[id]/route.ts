import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** GET /api/admin/product-groups/[id] */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: group, error } = await supabase
      .from('product_groups')
      .select('id, name, sort_order')
      .eq('id', id)
      .single()

    if (error || !group) {
      return NextResponse.json({ error: 'Product group not found' }, { status: 404 })
    }

    const { data: members } = await supabase
      .from('product_group_members')
      .select('product_key')
      .eq('group_id', id)

    const product_keys = members?.map((m) => m.product_key) ?? []

    return NextResponse.json({ ...group, product_keys, member_count: product_keys.length })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH /api/admin/product-groups/[id] – update name, sort_order */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('product_groups')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Product group not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, sort_order } = body
    const update: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      }
      update.name = name.trim()
    }
    if (sort_order !== undefined) {
      update.sort_order =
        typeof sort_order === 'number' && Number.isFinite(sort_order) ? sort_order : 0
    }

    if (Object.keys(update).length === 0) {
      const { data: g } = await supabase
        .from('product_groups')
        .select()
        .eq('id', id)
        .single()
      const { data: m } = await supabase
        .from('product_group_members')
        .select('product_key')
        .eq('group_id', id)
      return NextResponse.json({
        ...g,
        product_keys: m?.map((x) => x.product_key) ?? [],
        member_count: (m?.length ?? 0),
      })
    }

    const { data: updated, error } = await supabase
      .from('product_groups')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Product group update error:', error)
      return NextResponse.json({ error: 'Failed to update product group' }, { status: 500 })
    }

    const { data: m } = await supabase
      .from('product_group_members')
      .select('product_key')
      .eq('group_id', id)

    return NextResponse.json({
      ...updated,
      product_keys: m?.map((x) => x.product_key) ?? [],
      member_count: (m?.length ?? 0),
    })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/admin/product-groups/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('product_groups')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Product group not found' }, { status: 404 })
    }

    const { error } = await supabase.from('product_groups').delete().eq('id', id)

    if (error) {
      console.error('Product group delete error:', error)
      return NextResponse.json({ error: 'Failed to delete product group' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
