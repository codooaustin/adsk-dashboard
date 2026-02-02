import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: mappings, error } = await supabase
      .from('corporate_account_mappings')
      .select('corporate_account_name, account_id')

    if (error) {
      console.error('Error fetching mappings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch mappings' },
        { status: 500 }
      )
    }

    // Convert to object format: corporate_account_name -> account_id
    const mappingsObject: Record<string, string> = {}
    for (const mapping of mappings || []) {
      mappingsObject[mapping.corporate_account_name] = mapping.account_id
    }

    return NextResponse.json(mappingsObject, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
