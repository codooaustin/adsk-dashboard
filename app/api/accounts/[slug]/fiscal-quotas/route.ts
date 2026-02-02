import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch account by slug
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Fetch all fiscal quotas for this account
    const { data: quotas, error } = await supabase
      .from('account_fiscal_quotas')
      .select('*')
      .eq('account_id', account.id)
      .order('fiscal_year', { ascending: false })

    if (error) {
      console.error('Error fetching fiscal quotas:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fiscal quotas' },
        { status: 500 }
      )
    }

    return NextResponse.json(quotas || [], { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch account by slug
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { fiscal_year, acv_quota, token_quota } = body

    // Validation
    if (!fiscal_year || typeof fiscal_year !== 'number') {
      return NextResponse.json(
        { error: 'Fiscal year is required and must be a number' },
        { status: 400 }
      )
    }

    if (acv_quota === undefined || acv_quota === null || typeof acv_quota !== 'number') {
      return NextResponse.json(
        { error: 'ACV quota is required and must be a number' },
        { status: 400 }
      )
    }

    // Validate token_quota if provided
    if (token_quota !== undefined && token_quota !== null && typeof token_quota !== 'number') {
      return NextResponse.json(
        { error: 'Token quota must be a number' },
        { status: 400 }
      )
    }

    // Upsert fiscal quota (create or update if exists)
    const { data: quota, error: upsertError } = await supabase
      .from('account_fiscal_quotas')
      .upsert({
        account_id: account.id,
        fiscal_year: fiscal_year,
        acv_quota: acv_quota,
        token_quota: token_quota || null,
      }, {
        onConflict: 'account_id,fiscal_year',
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting fiscal quota:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save fiscal quota' },
        { status: 500 }
      )
    }

    return NextResponse.json(quota, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch account by slug
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const quotaId = searchParams.get('id')

    if (!quotaId) {
      return NextResponse.json(
        { error: 'Quota ID is required' },
        { status: 400 }
      )
    }

    // Verify quota belongs to this account
    const { data: quota, error: quotaError } = await supabase
      .from('account_fiscal_quotas')
      .select('id')
      .eq('id', quotaId)
      .eq('account_id', account.id)
      .single()

    if (quotaError || !quota) {
      return NextResponse.json(
        { error: 'Fiscal quota not found' },
        { status: 404 }
      )
    }

    // Delete quota
    const { error: deleteError } = await supabase
      .from('account_fiscal_quotas')
      .delete()
      .eq('id', quotaId)

    if (deleteError) {
      console.error('Error deleting fiscal quota:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete fiscal quota' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
