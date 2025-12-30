'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorDisplayProps {
  error: any
  retry?: () => void
  title?: string
}

export function ErrorDisplay({ error, retry, title = 'Error Loading Data' }: ErrorDisplayProps) {
  const errorMessage = error?.error?.message || error?.message || 'An unexpected error occurred'

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {errorMessage}
        </p>

        {retry && (
          <button
            onClick={retry}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
