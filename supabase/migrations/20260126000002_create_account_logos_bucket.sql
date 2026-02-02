-- Create Supabase Storage bucket for account logos
-- Phase: Account Management Enhancements

-- Create the account-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'account-logos',
  'account-logos',
  true, -- Public bucket so logos can be accessed via URL
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for account-logos bucket
-- Allow all operations for single-user app
CREATE POLICY "Allow all uploads account-logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'account-logos');

CREATE POLICY "Allow all reads account-logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'account-logos');

CREATE POLICY "Allow all deletes account-logos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'account-logos');
