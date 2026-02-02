-- Create Supabase Storage bucket for dataset files
-- Phase 2: Data Layer Setup

-- Create the datasets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'datasets',
  'datasets',
  false,
  52428800, -- 50MB in bytes
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Allow all operations for single-user app
-- These can be tightened later if authentication is added
-- Drop existing policies if they exist (in case of re-running migration)
DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

CREATE POLICY "Allow all uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'datasets');

CREATE POLICY "Allow all reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'datasets');

CREATE POLICY "Allow all deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'datasets');
