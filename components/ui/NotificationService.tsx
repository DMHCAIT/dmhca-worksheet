'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import toast from 'react-hot-toast'

export default function NotificationService() {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return

    // Check for overdue tasks every 30 minutes
    const checkOverdueTasks = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/check-overdue-tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.notificationsCreated > 0) {
            toast.error(`You have ${result.notificationsCreated} overdue task${result.notificationsCreated > 1 ? 's' : ''}!`, {
              duration: 5000,
              icon: '⚠️',
            })
          }
        }
      } catch (error) {
        console.error('Error checking overdue tasks:', error)
      }
    }

    // Check for new chat messages every 2 minutes
    const checkNewMessages = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/check-new-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.notificationsCreated > 0) {
            toast.success(`You have ${result.notificationsCreated} new message${result.notificationsCreated > 1 ? 's' : ''}!`, {
              duration: 4000,
              icon: '💬',
            })
          }
        }
      } catch (error) {
        console.error('Error checking new messages:', error)
      }
    }

    // Run initial checks after a delay
    const initialDelay = setTimeout(() => {
      checkOverdueTasks()
      checkNewMessages()
    }, 5000) // 5 seconds after mount

    // Set up intervals
    const overdueInterval = setInterval(checkOverdueTasks, 30 * 60 * 1000) // Every 30 minutes
    const messageInterval = setInterval(checkNewMessages, 2 * 60 * 1000) // Every 2 minutes

    return () => {
      clearTimeout(initialDelay)
      clearInterval(overdueInterval)
      clearInterval(messageInterval)
    }
  }, [isAuthenticated])

  // This component doesn't render anything
  return null
}