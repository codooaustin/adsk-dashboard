import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ingestDataset } from '@/lib/ingest/orchestrator'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params
    const supabase = await createClient()

    // Fetch dataset to get account_id
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('account_id, status')
      .eq('id', datasetId)
      .single()

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      )
    }

    if (dataset.status !== 'queued') {
      return NextResponse.json(
        { error: `Dataset is not in queued status. Current status: ${dataset.status}` },
        { status: 400 }
      )
    }

    console.log(`Starting processing for dataset ${datasetId}`)

    // Trigger ingestion
    const result = await ingestDataset(datasetId, dataset.account_id, supabase)
    
    console.log(`Processing completed for dataset ${datasetId}:`, result.success ? 'success' : 'failed', {
      rowsProcessed: result.rowsProcessed,
      rowsInserted: result.rowsInserted,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Processing failed',
          result,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Unexpected error processing dataset:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
