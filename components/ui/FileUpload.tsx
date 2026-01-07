'use client'

import { useState, useRef } from 'react'
import { Upload, X, File, AlertCircle } from 'lucide-react'

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
  existingFiles?: { name: string; url: string; size?: number }[]
  onRemoveExisting?: (url: string) => void
}

export function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
  existingFiles = [],
  onRemoveExisting
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setError('')

    // Check total file count
    if (selectedFiles.length + existingFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate each file
    const validFiles: File[] = []
    for (const file of files) {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles]
      setSelectedFiles(newFiles)
      onFilesChange(newFiles)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    onFilesChange(newFiles)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return '🖼️'
    } else if (['pdf'].includes(ext || '')) {
      return '📄'
    } else if (['doc', 'docx'].includes(ext || '')) {
      return '📝'
    } else if (['xls', 'xlsx'].includes(ext || '')) {
      return '📊'
    }
    return '📎'
  }

  const totalFiles = selectedFiles.length + existingFiles.length
  const canAddMore = totalFiles < maxFiles

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      {canAddMore && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            Max {maxFiles} files, up to {maxSizeMB}MB each
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supported: Images, PDF, Word, Excel, Text
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Existing Files:</p>
          {existingFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-green-700 hover:text-green-900 truncate block"
                  >
                    {file.name}
                  </a>
                  {file.size && (
                    <p className="text-xs text-green-600">{formatFileSize(file.size)}</p>
                  )}
                </div>
              </div>
              {onRemoveExisting && (
                <button
                  onClick={() => onRemoveExisting(file.url)}
                  className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">
            {existingFiles.length > 0 ? 'New Files:' : 'Selected Files:'}
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File Count Info */}
      {totalFiles > 0 && (
        <p className="text-xs text-gray-500 text-center">
          {totalFiles} / {maxFiles} files selected
        </p>
      )}
    </div>
  )
}
