/**
 * File Upload Security Utilities
 * Provides comprehensive file validation and security checks for uploads
 */

// Allowed file types with their MIME types and extensions
export const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // Videos
  'video/mp4': ['.mp4'],
  'video/avi': ['.avi'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/x-ms-wmv': ['.wmv'],
  'video/webm': ['.webm'],
  'video/x-flv': ['.flv'],
  'video/x-matroska': ['.mkv'],
  'video/3gpp': ['.3gp'],
  
  // Archives (with size limits)
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
} as const

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.app',
  '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.sh', '.bin', '.run', '.ps1', '.vb'
]

// File size limits in bytes
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB for images
  video: 200 * 1024 * 1024, // 200MB for videos
  document: 50 * 1024 * 1024, // 50MB for documents
  archive: 500 * 1024 * 1024, // 500MB for archives
  default: 50 * 1024 * 1024 // 50MB default
} as const

interface FileValidationResult {
  isValid: boolean
  error?: string
  metadata?: {
    type: string
    category: 'image' | 'video' | 'document' | 'archive' | 'other'
    size: number
    name: string
  }
}

/**
 * Validates file type against allowed MIME types and extensions
 */
export function validateFileType(file: File): { isValid: boolean; error?: string; category?: string } {
  const fileName = file.name.toLowerCase()
  const fileExtension = '.' + fileName.split('.').pop()
  const mimeType = file.type.toLowerCase()

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File type ${fileExtension} is not allowed for security reasons`
    }
  }

  // Find matching MIME type and extension
  const allowedEntry = Object.entries(ALLOWED_FILE_TYPES).find(([mime, extensions]) => {
    return mime === mimeType && (extensions as readonly string[]).includes(fileExtension)
  })

  if (!allowedEntry) {
    return {
      isValid: false,
      error: `File type ${mimeType} (${fileExtension}) is not allowed. Please use PDF, DOC, XLS, TXT, JPG, PNG, GIF, MP4, MOV, AVI, or ZIP files.`
    }
  }

  // Determine file category
  let category: string = 'other'
  if (mimeType.startsWith('image/')) category = 'image'
  else if (mimeType.startsWith('video/')) category = 'video'
  else if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('excel') || mimeType === 'text/plain') category = 'document'
  else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) category = 'archive'

  return { isValid: true, category }
}

/**
 * Validates file size against category-specific limits
 */
export function validateFileSize(file: File, category: string): { isValid: boolean; error?: string } {
  let sizeLimit: number

  switch (category) {
    case 'image':
      sizeLimit = FILE_SIZE_LIMITS.image
      break
    case 'video':
      sizeLimit = FILE_SIZE_LIMITS.video
      break
    case 'archive':
      sizeLimit = FILE_SIZE_LIMITS.archive
      break
    case 'document':
      sizeLimit = FILE_SIZE_LIMITS.document
      break
    default:
      sizeLimit = FILE_SIZE_LIMITS.default
  }

  if (file.size > sizeLimit) {
    const limitMB = Math.round(sizeLimit / (1024 * 1024))
    const fileMB = Math.round(file.size / (1024 * 1024))
    return {
      isValid: false,
      error: `File size (${fileMB}MB) exceeds ${limitMB}MB limit for ${category} files`
    }
  }

  return { isValid: true }
}

/**
 * Simulates virus scanning (placeholder for real antivirus integration)
 * In production, integrate with services like VirusTotal, ClamAV, or cloud scanning
 */
export async function simulateVirusScanning(file: File): Promise<{ isClean: boolean; error?: string }> {
  // Simulate scanning delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    /\.exe\./, /virus/, /malware/, /trojan/, /backdoor/, /keylogger/
  ]
  
  const fileName = file.name.toLowerCase()
  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(fileName))
  
  if (hasSuspiciousPattern) {
    return {
      isClean: false,
      error: 'File flagged by security scan - suspicious filename pattern detected'
    }
  }

  // In production, this would call actual antivirus APIs
  // For now, randomly simulate a 1% chance of detecting something (for testing)
  const randomScan = Math.random()
  if (randomScan < 0.01) {
    return {
      isClean: false,
      error: 'File flagged by security scan - potential threat detected'
    }
  }

  return { isClean: true }
}

/**
 * Sanitizes filename by removing dangerous characters
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255) // Limit length
}

/**
 * Comprehensive file validation combining all security checks
 */
export async function validateFileUpload(file: File): Promise<FileValidationResult> {
  try {
    // 1. Validate file type
    const typeValidation = validateFileType(file)
    if (!typeValidation.isValid) {
      return { isValid: false, error: typeValidation.error }
    }

    // 2. Validate file size
    const sizeValidation = validateFileSize(file, typeValidation.category!)
    if (!sizeValidation.isValid) {
      return { isValid: false, error: sizeValidation.error }
    }

    // 3. Virus scanning simulation
    const virusCheck = await simulateVirusScanning(file)
    if (!virusCheck.isClean) {
      return { isValid: false, error: virusCheck.error }
    }

    // 4. Check for empty files
    if (file.size === 0) {
      return { isValid: false, error: 'Empty files are not allowed' }
    }

    // 5. Validate filename length
    if (file.name.length > 255) {
      return { isValid: false, error: 'Filename is too long (max 255 characters)' }
    }

    // All checks passed
    return {
      isValid: true,
      metadata: {
        type: file.type,
        category: typeValidation.category as any,
        size: file.size,
        name: sanitizeFileName(file.name)
      }
    }
  } catch (error) {
    console.error('File validation error:', error)
    return {
      isValid: false,
      error: 'File validation failed due to technical error'
    }
  }
}

/**
 * Create a secure FormData object for file upload
 */
export function createSecureFormData(
  file: File, 
  metadata: { name: string; type: string; size: number },
  additionalFields?: Record<string, string>
): FormData {
  const formData = new FormData()
  
  // Add the file with sanitized name
  formData.append('file', file, metadata.name)
  
  // Add metadata
  formData.append('originalName', file.name)
  formData.append('sanitizedName', metadata.name)
  formData.append('fileType', metadata.type)
  formData.append('fileSize', metadata.size.toString())
  formData.append('uploadTimestamp', new Date().toISOString())
  
  // Add any additional fields
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value)
    })
  }
  
  return formData
}