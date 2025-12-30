# Supabase Storage Setup Guide

## Overview
The task management system now uses **real Supabase Storage** for file uploads instead of placeholder URLs.

## 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com/project/eqeikrpqtzypfbcdzbrc

2. Navigate to **Storage** in the left sidebar

3. Click **Create a new bucket**

4. Configure the bucket:
   - **Name**: `task-attachments`
   - **Public bucket**: ✅ Enabled (so files can be accessed via public URL)
   - **File size limit**: 50MB (recommended)
   - **Allowed MIME types**: Leave empty to allow all types

5. Click **Create bucket**

## 2. Set Storage Policies (Security)

After creating the bucket, you need to set up Row Level Security (RLS) policies:

### Allow Authenticated Users to Upload
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');
```

### Allow Public Read Access
```sql
-- Allow anyone to read files
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-attachments');
```

### Allow Users to Delete Their Own Files
```sql
-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');
```

## 3. Verify Configuration

Your storage is now configured with:
- **Bucket Name**: `task-attachments`
- **Upload Path Pattern**: `tasks/{taskId}/{timestamp}-{random}.{ext}`
- **Public URL Format**: `https://eqeikrpqtzypfbcdzbrc.supabase.co/storage/v1/object/public/task-attachments/tasks/{taskId}/{filename}`

## 4. Environment Variables (Already Configured)

The following environment variables should be set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://eqeikrpqtzypfbcdzbrc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

These are already configured in your project.

## 5. Code Implementation (Already Done)

✅ **Installed**: `@supabase/supabase-js` package  
✅ **Created**: `/lib/supabase/client.ts` with upload/delete helpers  
✅ **Updated**: `/app/tasks/page.tsx` to use real file uploads  

## 6. Testing the Feature

To test file uploads:

1. Navigate to the Tasks page
2. Click **View** on any task
3. In the modal, go to the **Attachments** tab
4. Click **Upload File** and select a file
5. The file should upload to Supabase Storage and appear in the list

## 7. File Upload Flow

```
User selects file
    ↓
uploadTaskFile() in /lib/supabase/client.ts
    ↓
Uploads to Supabase Storage: tasks/{taskId}/{filename}
    ↓
Returns public URL
    ↓
tasksApi.addAttachment() saves metadata to database
    ↓
File appears in attachments list with download link
```

## 8. File Deletion Flow

```
User clicks delete on attachment
    ↓
tasksApi.deleteAttachment() removes database record
    ↓
deleteTaskFile() removes file from Supabase Storage
    ↓
Attachment removed from UI
```

## 9. Storage Limits

- **Free Tier**: 1GB storage
- **Pro Tier**: 100GB storage
- **File Size Limit**: Can be configured per bucket (recommended: 50MB)

## 10. Troubleshooting

### Files not uploading?
- Check that `task-attachments` bucket exists
- Verify bucket is set to **public**
- Check browser console for errors
- Verify environment variables are set

### 403 Forbidden errors?
- Check storage policies are created
- Verify user is authenticated
- Check bucket permissions

### Files not deleting?
- Check delete policy exists
- Verify user has permission
- Check file path is correct

## 11. S3 Compatible Endpoint

Your Supabase Storage also provides an S3-compatible endpoint:
```
https://eqeikrpqtzypfbcdzbrc.storage.supabase.co/storage/v1/s3
```

This can be used with S3-compatible tools and libraries if needed.
