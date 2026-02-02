import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; datasetId: string }> }
) {
  try {
    const { slug, datasetId } = await params
    const supabase = await createClient()

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('id, account_id, storage_path')
      .eq('id', datasetId)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    if (dataset.account_id !== account.id) {
      return NextResponse.json(
        { error: 'Dataset does not belong to this account' },
        { status: 403 }
      )
    }

    const { error: storageError } = await supabase.storage
      .from('datasets')
      .remove([dataset.storage_path])

    if (storageError) {
      console.warn('Storage remove failed (continuing with DB delete):', storageError)
    }

    const { error: deleteError } = await supabase
      .from('datasets')
      .delete()
      .eq('id', datasetId)

    if (deleteError) {
      console.error('Dataset delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete dataset' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error deleting dataset:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
