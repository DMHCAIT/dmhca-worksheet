'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
      setIsRedirecting(false)
    }
  }, [user, loading, router])

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading DMHCA Work Tracker...</div>
        </div>
      </div>
    )
  }

  return null
}