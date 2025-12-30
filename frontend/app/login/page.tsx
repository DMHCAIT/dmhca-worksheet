'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginForm from '../../components/LoginForm'
import { authApi } from '../../lib/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken')
    if (token) {
      router.push('/dashboard')
    } else {
      setLoading(false)
    }
  }, [router])

  const handleLogin = async (credentials: any) => {
    try {
      if (credentials.isRegister) {
        // Register new user
        const { user, token } = await authApi.register({
          email: credentials.email,
          password: credentials.password,
          full_name: credentials.full_name,
          team: credentials.team,
          role: credentials.role
        })
        
        localStorage.setItem('authToken', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        toast.success('Account created successfully!')
        router.push('/dashboard')
      } else {
        // Login existing user
        const { user, token } = await authApi.login(credentials.email, credentials.password)
        
        localStorage.setItem('authToken', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        toast.success('Login successful!')
        router.push('/dashboard')
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Authentication failed'
      throw new Error(message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <LoginForm onLogin={handleLogin} />
}