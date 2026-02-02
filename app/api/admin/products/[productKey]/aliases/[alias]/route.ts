import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** DELETE /api/admin/products/[productKey]/aliases/[alias]. Alias segment must be URL-encoded. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productKey: string; alias: string }> }
) {
  try {
    const { productKey, alias: encodedAlias } = await params
    const key = decodeURIComponent(productKey)
    const alias = decodeURIComponent(encodedAlias)
    const supabase = await createClient()

    const { data: row } = await supabase
      .from('product_aliases')
      .select('alias, product_key')
      .eq('alias', alias)
      .single()

    if (!row) {
      return NextResponse.json({ error: 'Alias not found' }, { status: 404 })
    }

    if (row.product_key !== key) {
      return NextResponse.json({ error: 'Alias does not belong to this product' }, { status: 403 })
    }

    const { error } = await supabase.from('product_aliases').delete().eq('alias', alias)

    if (error) {
      console.error('Alias delete error:', error)
      return NextResponse.json({ error: 'Failed to remove alias' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
