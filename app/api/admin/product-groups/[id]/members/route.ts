import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** GET /api/admin/product-groups/[id]/members */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: group } = await supabase
      .from('product_groups')
      .select('id')
      .eq('id', id)
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Product group not found' }, { status: 404 })
    }

    const { data: members, error } = await supabase
      .from('product_group_members')
      .select('product_key')
      .eq('group_id', id)
      .order('product_key')

    if (error) {
      console.error('Members fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    return NextResponse.json(members ?? [])
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/admin/product-groups/[id]/members – body: { product_key: string } */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: group } = await supabase
      .from('product_groups')
      .select('id')
      .eq('id', id)
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Product group not found' }, { status: 404 })
    }

    const body = await request.json()
    const product_key = typeof body?.product_key === 'string' ? body.product_key.trim() : ''
    if (!product_key) {
      return NextResponse.json({ error: 'product_key is required' }, { status: 400 })
    }

    const { data: product } = await supabase
      .from('products')
      .select('product_key')
      .eq('product_key', product_key)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('product_group_members')
      .insert({ group_id: id, product_key })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Product is already in this group' }, { status: 409 })
      }
      console.error('Member insert error:', error)
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    return NextResponse.json({ group_id: id, product_key }, { status: 201 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
