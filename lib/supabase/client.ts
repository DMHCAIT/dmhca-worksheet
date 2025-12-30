import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to upload file to Supabase Storage
export async function uploadTaskFile(file: File, taskId: number): Promise<{ url: string; path: string }> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `tasks/${taskId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('content')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw error
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('content')
    .getPublicUrl(filePath)

  return {
    url: publicUrl,
    path: filePath
  }
}

// Helper function to delete file from Supabase Storage
export async function deleteTaskFile(fileUrlOrPath: string): Promise<void> {
  // If it's an example.com URL, skip deletion
  if (fileUrlOrPath.includes('example.com')) {
    console.log('Skipping deletion of placeholder URL')
    return
  }

  // Extract path from URL if needed
  let filePath = fileUrlOrPath
  if (fileUrlOrPath.startsWith('http')) {
    // Extract path from Supabase URL
    const urlParts = fileUrlOrPath.split('/content/')
    if (urlParts.length > 1) {
      filePath = urlParts[1]
    }
  }

  const { error } = await supabase.storage
    .from('content')
    .remove([filePath])

  if (error) {
    throw error
  }
}
