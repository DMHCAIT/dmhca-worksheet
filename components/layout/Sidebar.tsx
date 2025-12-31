'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthProvider'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LogOut, Menu } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', roles: ['admin', 'team_lead', 'employee'] },
  { name: 'Projects', href: '/projects', icon: '📁', roles: ['admin', 'team_lead', 'employee'] },
  { name: 'Tasks', href: '/tasks', icon: '✅', roles: ['admin', 'team_lead', 'employee'] },
  { name: 'Work Projections', href: '/projections', icon: '📊', roles: ['admin', 'team_lead', 'employee'] },
  { name: 'Chat', href: '/chat', icon: '💬', roles: ['admin', 'team_lead', 'employee'] },
  { name: 'Team', href: '/team', icon: '👥', roles: ['admin', 'team_lead'] },
  { name: 'Reports', href: '/reports', icon: '📈', roles: ['admin', 'team_lead'] },
  { name: 'Settings', href: '/settings', icon: '⚙️', roles: ['admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const filteredNavigation = navigation.filter(item => 
    user && item.roles.includes(user.role)
  )

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!user) return null

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 z-50 p-4">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-md shadow-md"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
          <h1 className="text-xl font-bold text-white">DMHCA Work Tracker</h1>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              <p className="text-xs text-gray-400 capitalize">{user.department || user.team || 'No Department'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1">
          <ul className="space-y-2 px-4">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="mr-3 h-4 w-4" />
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}