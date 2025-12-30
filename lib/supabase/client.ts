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
export async function deleteTaskFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('content')
    .remove([filePath])

  if (error) {
    throw error
  }
}
