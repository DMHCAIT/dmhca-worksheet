'use client'

import { useState, useRef } from 'react'
import { Paperclip, X, Send, Image, Video, File } from 'lucide-react'
import { uploadChatFile, getFileTypeCategory } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface ChatFileUploadProps {
  onFileUpload: (fileData: {
    file_url: string
    file_name: string
    file_size: number
    file_type: string
    message_type: string
  }) => void
  senderId: string
  receiverId: string
  disabled?: boolean
}

export function ChatFileUpload({ onFileUpload, senderId, receiverId, disabled }: ChatFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Videos
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv', 'video/3gpp',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    // Additional formats for chat
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'
  ]

  const isFileSupported = (file: File): boolean => {
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()
    
    // Check MIME type first
    if (supportedTypes.includes(fileType)) {
      return true
    }

    // Check file extensions as fallback
    const supportedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', // images
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.3gp', '.m4v', // videos
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', // documents
      '.mp3', '.wav', '.ogg', '.m4a' // audio
    ]
    
    return supportedExtensions.some(ext => fileName.endsWith(ext))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!isFileSupported(file)) {
      toast.error('File type not supported. Please use images, videos, documents, or audio files.')
      return
    }

    // Validate file size (50MB limit for videos, 10MB for others)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith('video/') ? 50 : 10
      toast.error(`File size exceeds ${maxSizeMB}MB limit`)
      return
    }

    setSelectedFile(file)

    // Create preview for images and videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const { url, path } = await uploadChatFile(selectedFile, senderId, receiverId)
      
      const messageType = getFileTypeCategory(selectedFile.name, selectedFile.type)
      
      onFileUpload({
        file_url: url,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        message_type: messageType
      })

      // Clean up
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      
      toast.success('File uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  if (selectedFile) {
    return (
      <div className="p-3 border rounded-lg bg-blue-50 space-y-3">
        <div className="flex items-center gap-2">
          {getFileIcon(selectedFile)}
          <span className="text-sm font-medium text-gray-900 flex-1 truncate">
            {selectedFile.name}
          </span>
          <span className="text-xs text-gray-500">
            {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
          </span>
        </div>

        {previewUrl && (
          <div className="max-w-xs">
            {selectedFile.type.startsWith('image/') ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-32 object-cover rounded border"
              />
            ) : selectedFile.type.startsWith('video/') ? (
              <video 
                src={previewUrl} 
                className="w-full h-32 object-cover rounded border"
                controls
              />
            ) : null}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            <Send className="w-4 h-4" />
            {uploading ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
        title="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={supportedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  )
}