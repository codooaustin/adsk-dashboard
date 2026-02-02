import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** GET /api/admin/product-names – list product_names. ?for_dashboard=1 returns map product_name -> { display_label, tag, color }. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forDashboard = searchParams.get('for_dashboard') === '1'
    const supabase = await createClient()

    const { data: rows, error } = await supabase
      .from('product_names')
      .select('product_name, display_label, tag, color, logo_url')
      .order('product_name', { ascending: true })

    if (error) {
      console.error('Product names fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch product names' }, { status: 500 })
    }

    const list = rows ?? []

    if (forDashboard) {
      const map: Record<string, { display_label: string | null; tag: string | null; color: string | null; logo_url: string | null }> = {}
      list.forEach((r) => {
        map[r.product_name] = {
          display_label: r.display_label ?? null,
          tag: r.tag ?? null,
          color: r.color ?? null,
          logo_url: r.logo_url ?? null,
        }
      })
      return NextResponse.json(map)
    }

    return NextResponse.json(list)
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
