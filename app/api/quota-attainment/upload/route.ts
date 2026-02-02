import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseQuotaAttainmentExcel, extractCommissionMonths, extractCorporateAccountNames } from '@/lib/ingest/quotaAttainmentParser'

const ALLOWED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['.xlsx', '.xls', '.csv']
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `quota-attainment/${timestamp}-${sanitizedFilename}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('datasets')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Parse Excel file to extract Corporate Account Names and commission months
    let parsedRows
    let commissionMonths: string[] = []
    let corporateAccountNames: string[] = []
    
    try {
      parsedRows = parseQuotaAttainmentExcel(buffer)
      commissionMonths = extractCommissionMonths(parsedRows)
      corporateAccountNames = extractCorporateAccountNames(parsedRows)
    } catch (error) {
      console.error('Error parsing Excel file:', error)
      // Clean up uploaded file
      await supabase.storage.from('datasets').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to parse Excel file. Please ensure it is a valid quota attainment spreadsheet.' },
        { status: 400 }
      )
    }

    // Fetch existing mappings to determine which Corporate Account Names are already mapped
    const { data: existingMappings } = await supabase
      .from('corporate_account_mappings')
      .select('corporate_account_name')

    const mappedNames = new Set(
      existingMappings?.map(m => m.corporate_account_name) || []
    )

    const unmappedNames = corporateAccountNames.filter(name => !mappedNames.has(name))

    // Create upload record
    const { data: uploadRecord, error: uploadRecordError } = await supabase
      .from('quota_attainment_uploads')
      .insert({
        original_filename: file.name,
        storage_path: storagePath,
        status: 'processing',
        row_count: parsedRows.length,
        commission_months: commissionMonths,
      })
      .select()
      .single()

    if (uploadRecordError) {
      console.error('Error creating upload record:', uploadRecordError)
      // Clean up uploaded file
      await supabase.storage.from('datasets').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      upload_id: uploadRecord.id,
      row_count: parsedRows.length,
      commission_months: commissionMonths,
      corporate_account_names: corporateAccountNames,
      unmapped_names: unmappedNames,
      mapped_names: Array.from(mappedNames).filter(name => corporateAccountNames.includes(name)),
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
