-- Run this in your Supabase SQL Editor to fix storage upload issues
-- Step 1: Make sure the bucket exists and is public

-- Update bucket to be public
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 52428800,  -- 50MB
    allowed_mime_types = NULL     -- Allow all file types
WHERE id = 'content';

-- If bucket doesn't exist, create it (this will fail silently if it exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('content', 'content', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Remove all existing policies
DROP POLICY IF EXISTS "Authenticated users can upload to content bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to content bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from content bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update content bucket" ON storage.objects;

-- Step 3: Create simple, permissive policies for the content bucket

-- Allow anyone (authenticated or not) to upload
CREATE POLICY "Allow all uploads to content"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'content');

-- Allow anyone to read files
CREATE POLICY "Allow all reads from content"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'content');

-- Allow anyone to delete (you might want to restrict this later)
CREATE POLICY "Allow all deletes from content"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'content');

-- Allow anyone to update
CREATE POLICY "Allow all updates to content"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'content')
WITH CHECK (bucket_id = 'content');

-- Step 4: Verify the setup
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'content';
