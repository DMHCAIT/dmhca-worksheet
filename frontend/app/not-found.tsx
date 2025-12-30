import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mt-4">Page not found</p>
        <p className="text-gray-500 mt-2">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 space-y-4">
          <Link 
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <br />
          <Link 
            href="/login"
            className="inline-block text-blue-600 hover:text-blue-700 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}