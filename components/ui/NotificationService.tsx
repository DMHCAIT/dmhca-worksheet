'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import toast from 'react-hot-toast'

export default function NotificationService() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Check for overdue tasks every 30 minutes
    const checkOverdueTasks = async () => {
      try {
        console.log('🔍 Checking overdue tasks...')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/check-overdue-tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ Overdue tasks check result:', result)
          if (result.notificationsCreated > 0) {
            toast.error(`You have ${result.notificationsCreated} overdue task${result.notificationsCreated > 1 ? 's' : ''}!`, {
              duration: 5000,
              icon: '⚠️',
            })
          }
        } else {
          console.error('❌ Overdue tasks check failed:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error checking overdue tasks:', error)
      }
    }

    // Check for new chat messages every 2 minutes
    const checkNewMessages = async () => {
      try {
        console.log('💬 Checking new messages...')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/check-new-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ New messages check result:', result)
          if (result.notificationsCreated > 0) {
            toast.success(`You have ${result.notificationsCreated} new message${result.notificationsCreated > 1 ? 's' : ''}!`, {
              duration: 4000,
              icon: '💬',
            })
          }
        } else {
          console.error('❌ New messages check failed:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error checking new messages:', error)
      }
    }

    // Run initial checks after a delay
    const initialDelay = setTimeout(() => {
      console.log('🚀 Starting notification service for user:', user?.full_name)
      checkOverdueTasks()
      checkNewMessages()
    }, 5000) // 5 seconds after mount

    // Set up intervals
    const overdueInterval = setInterval(checkOverdueTasks, 5 * 60 * 1000) // Every 5 minutes for testing
    const messageInterval = setInterval(checkNewMessages, 2 * 60 * 1000) // Every 2 minutes

    console.log('⏰ Notification intervals set up')

    return () => {
      clearTimeout(initialDelay)
      clearInterval(overdueInterval)
      clearInterval(messageInterval)
      console.log('🛑 Notification service cleanup')
    }
  }, [user])

  // This component doesn't render anything
  return null
}