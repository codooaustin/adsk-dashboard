import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
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
      token_quantity
    } = body

    // Validation - only name is required
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      )
    }

    // Validate contract_type if provided
    if (contract_type && !['Enterprise Business Agreement', 'Named User Subscriptions'].includes(contract_type)) {
      return NextResponse.json(
        { error: 'Invalid contract type' },
        { status: 400 }
      )
    }

    // Auto-generate slug from name
    const baseSlug = generateSlug(name.trim())
    
    // Check for duplicate name or slug
    const { data: existingAccounts, error: checkError } = await supabase
      .from('accounts')
      .select('id, name, slug')
      .or(`name.eq.${name.trim()},slug.eq.${baseSlug}`)

    if (checkError) {
      console.error('Error checking duplicates:', checkError)
      return NextResponse.json(
        { error: 'Failed to validate account' },
        { status: 500 }
      )
    }

    if (existingAccounts && existingAccounts.length > 0) {
      const duplicate = existingAccounts[0]
      if (duplicate.name === name.trim()) {
        return NextResponse.json(
          { error: 'An account with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Generate unique slug if base slug already exists
    const existingSlugs = existingAccounts?.map(a => a.slug) || []
    const slug = generateUniqueSlug(baseSlug, existingSlugs)

    // Insert new account
    const { data: account, error: insertError } = await supabase
      .from('accounts')
      .insert({
        name: name.trim(),
        slug: slug,
        sfdc_account_id: sfdc_account_id?.trim() || null,
        notes: notes?.trim() || null,
        logo_url: logo_url?.trim() || null,
        contract_type: contract_type || null,
        contract_start_date: contract_start_date || null,
        contract_end_date: contract_end_date || null,
        annual_contract_value: annual_contract_value || null,
        token_quantity: token_quantity || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating account:', insertError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching accounts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json(accounts || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
