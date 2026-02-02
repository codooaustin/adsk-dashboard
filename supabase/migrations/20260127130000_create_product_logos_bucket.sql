-- Create Supabase Storage bucket for product logos
-- Path pattern: {product_key}/{timestamp}-{filename}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-logos',
  'product-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow all uploads product-logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-logos');

CREATE POLICY "Allow all reads product-logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-logos');

CREATE POLICY "Allow all deletes product-logos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'product-logos');
