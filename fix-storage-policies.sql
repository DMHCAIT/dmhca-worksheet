-- Run this in your Supabase SQL Editor to fix storage upload issues

-- First, check if policies exist and drop them
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Create policy to allow authenticated users to upload files to 'content' bucket
CREATE POLICY "Authenticated users can upload to content bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content');

-- Create policy to allow anyone to read files from 'content' bucket
CREATE POLICY "Public read access to content bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'content');

-- Create policy to allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete from content bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'content');

-- Create policy to allow authenticated users to update files
CREATE POLICY "Authenticated users can update content bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'content')
WITH CHECK (bucket_id = 'content');

-- Verify the bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'content';
