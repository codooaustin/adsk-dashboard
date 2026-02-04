-- Increase datasets bucket file size limit from 50MB to 100MB.
-- Note: Uploads over 50MB require Supabase Pro; on free tier Storage will still reject.
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'datasets';
