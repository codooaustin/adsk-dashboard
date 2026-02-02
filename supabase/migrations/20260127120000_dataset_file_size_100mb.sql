-- Increase datasets bucket file size limit from 50MB to 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'datasets';
