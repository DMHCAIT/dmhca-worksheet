'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUserData: (user: User, token: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
    
    // Listen for storage changes (login from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === 'user') {
        checkAuthStatus()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
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
    // Login handled by authApi in components
    throw new Error('Use authApi.login() directly')
  }

  const setUserData = (userData: User, token: string) => {
    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
    Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'strict' })
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    Cookies.remove('authToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUserData }}>
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

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, router, pathname])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}
