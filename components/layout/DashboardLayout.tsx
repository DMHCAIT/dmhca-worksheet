'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import Sidebar from './Sidebar'
import NotificationService from '@/components/ui/NotificationService'
import RealTimeNotificationService from '@/components/ui/RealTimeNotificationService'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationService />
      <RealTimeNotificationService />
      <Sidebar />
      <div className="lg:pl-64">
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}