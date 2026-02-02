-- Create quota_attainment_uploads table for tracking quota attainment file uploads
-- Phase: Quota Attainment Tracking System

CREATE TABLE quota_attainment_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  row_count INTEGER,
  commission_months TEXT[]
);

CREATE INDEX idx_quota_attainment_uploads_status ON quota_attainment_uploads(status);
CREATE INDEX idx_quota_attainment_uploads_uploaded_at ON quota_attainment_uploads(uploaded_at DESC);

COMMENT ON TABLE quota_attainment_uploads IS 'Metadata for uploaded quota attainment Excel files';
COMMENT ON COLUMN quota_attainment_uploads.status IS 'Processing status: processing, completed, or failed';
COMMENT ON COLUMN quota_attainment_uploads.commission_months IS 'Array of commission months found in this upload (e.g., ["January", "February"])';
COMMENT ON COLUMN quota_attainment_uploads.row_count IS 'Number of transaction rows in the uploaded file';

-- Enable Row Level Security
ALTER TABLE quota_attainment_uploads ENABLE ROW LEVEL SECURITY;

-- Permissive policy (allow all for single-user app)
CREATE POLICY "Allow all on quota_attainment_uploads" ON quota_attainment_uploads FOR ALL USING (true);
