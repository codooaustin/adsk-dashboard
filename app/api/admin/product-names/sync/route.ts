import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** POST /api/admin/product-names/sync – run Discover (distinct product_name from raw tables, upsert into product_names). */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('discover_product_names')

    if (error) {
      console.error('Discover product names error:', error)
      return NextResponse.json(
        { error: 'Failed to sync product names', details: error.message },
        { status: 500 }
      )
    }

    const added = Number((data as { added?: number })?.added ?? 0)
    const already_existing = Number((data as { already_existing?: number })?.already_existing ?? 0)
    return NextResponse.json({ added, already_existing })
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
