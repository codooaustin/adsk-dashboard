import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** DELETE /api/admin/product-groups/[id]/members/[productKey] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; productKey: string }> }
) {
  try {
    const { id, productKey } = await params
    const key = decodeURIComponent(productKey)
    const supabase = await createClient()

    const { data: row } = await supabase
      .from('product_group_members')
      .select('group_id, product_key')
      .eq('group_id', id)
      .eq('product_key', key)
      .single()

    if (!row) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('product_group_members')
      .delete()
      .eq('group_id', id)
      .eq('product_key', key)

    if (error) {
      console.error('Member delete error:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
