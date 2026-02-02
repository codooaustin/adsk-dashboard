import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch account by slug
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      sfdc_account_id,
      notes,
      logo_url,
      contract_type,
      contract_start_date,
      contract_end_date,
      annual_contract_value,
      token_quantity,
    } = body

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {}

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { error: 'Account name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (sfdc_account_id !== undefined) {
      updateData.sfdc_account_id = sfdc_account_id?.trim() || null
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null
    }

    if (logo_url !== undefined) {
      updateData.logo_url = logo_url?.trim() || null
    }

    if (contract_type !== undefined) {
      if (contract_type && !['Enterprise Business Agreement', 'Named User Subscriptions'].includes(contract_type)) {
        return NextResponse.json(
          { error: 'Invalid contract type' },
          { status: 400 }
        )
      }
      updateData.contract_type = contract_type || null
    }

    if (contract_start_date !== undefined) {
      updateData.contract_start_date = contract_start_date || null
    }

    if (contract_end_date !== undefined) {
      updateData.contract_end_date = contract_end_date || null
    }

    if (annual_contract_value !== undefined) {
      updateData.annual_contract_value = annual_contract_value || null
    }

    if (token_quantity !== undefined) {
      updateData.token_quantity = token_quantity || null
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== account.name) {
      const { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('name', updateData.name)
        .neq('id', account.id)
        .single()

      if (existingAccount) {
        return NextResponse.json(
          { error: 'An account with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Update account
    const { data: updatedAccount, error: updateError } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', account.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating account:', updateError)
      return NextResponse.json(
        { error: 'Failed to update account' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedAccount, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    const { data: account, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(account, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
