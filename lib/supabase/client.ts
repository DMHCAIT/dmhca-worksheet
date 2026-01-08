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

// Helper function to upload file for work log
export async function uploadWorkLogFile(file: File, workLogId: number, userId: string): Promise<{ url: string; path: string }> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `work-logs/${userId}/${workLogId}/${fileName}`

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

// Helper function to delete work log file
export async function deleteWorkLogFile(fileUrlOrPath: string): Promise<void> {
  return deleteTaskFile(fileUrlOrPath) // Reuse the same logic
}

// Helper function to upload file for chat
export async function uploadChatFile(file: File, senderId: string, receiverId: string): Promise<{ url: string; path: string }> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `chat/${senderId}/${receiverId}/${fileName}`

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

// Helper function to delete chat file
export async function deleteChatFile(fileUrlOrPath: string): Promise<void> {
  return deleteTaskFile(fileUrlOrPath) // Reuse the same logic
}

// Helper function to get file type category
export function getFileTypeCategory(fileName: string, mimeType?: string): 'image' | 'video' | 'document' | 'text' | 'file' {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  // Image types
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '') || 
      mimeType?.startsWith('image/')) {
    return 'image'
  }
  
  // Video types
  if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', '3gp'].includes(ext || '') || 
      mimeType?.startsWith('video/')) {
    return 'video'
  }
  
  // Document types
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '') || 
      mimeType?.includes('pdf') || mimeType?.includes('document') || mimeType?.includes('sheet') || mimeType?.includes('presentation')) {
    return 'document'
  }
  
  // Text types
  if (['txt', 'csv', 'json', 'xml', 'yaml', 'yml', 'md'].includes(ext || '') || 
      mimeType?.startsWith('text/')) {
    return 'text'
  }
  
  // Default
  return 'file'
}
