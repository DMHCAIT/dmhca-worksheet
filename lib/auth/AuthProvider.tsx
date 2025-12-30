'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '../api'
import toast from 'react-hot-toast'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  team: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken') || Cookies.get('authToken')
      const storedUser = localStorage.getItem('user')
      
      if (token && storedUser) {
        try {
          // Parse stored user first (don't wait for API on page load)
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
          
          // Ensure cookie is set
          if (!Cookies.get('authToken')) {
            Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'strict' })
          }
        } catch (error) {
          console.error('Failed to parse user:', error)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { user, token } = await authApi.login(email, password)
      
      // Set both localStorage and cookie
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'strict' })
      
      setUser(user)
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed'
      toast.error(message)
      throw error
    }
  }

  const register = async (userData: any) => {
    try {
      const { user, token } = await authApi.register(userData)
      
      // Set both localStorage and cookie
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'strict' })
      
      setUser(user)
      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      Cookies.remove('authToken')
      toast.success('Logged out successfully')
      router.push('/login')
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Protected route wrapper
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}