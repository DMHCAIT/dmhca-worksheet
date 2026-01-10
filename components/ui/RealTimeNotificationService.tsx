'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useQueryClient } from '@tanstack/react-query'
import { notificationKeys } from '@/lib/hooks/useNotifications'
import { NotificationType } from '@/types/entities'
import toast from 'react-hot-toast'

export default function RealTimeNotificationService() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user) {
      // Clean up if user logs out
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    const connectSSE = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      console.log('🌊 Connecting to real-time notification stream...')

      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          console.error('❌ No auth token available for SSE connection')
          return
        }

        const eventSource = new EventSource(
          `${process.env.NEXT_PUBLIC_API_URL}/api/sse/stream?token=${encodeURIComponent(token)}`
        )

        eventSource.onopen = () => {
          console.log('✅ Real-time notification stream connected')
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            switch (data.type) {
              case 'connected':
                console.log('🌊 SSE connection established')
                break
                
              case 'heartbeat':
                // Silent heartbeat
                break
                
              case 'notification':
                console.log('🔔 Received real-time notification:', data.notification)
                handleNewNotification(data.notification)
                break
                
              default:
                console.log('🌊 Unknown SSE message:', data)
            }
          } catch (error) {
            console.error('❌ Error parsing SSE message:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('❌ SSE connection error:', error)
          
          // Attempt to reconnect after a delay
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user) { // Only reconnect if user is still logged in
              console.log('🔄 Attempting to reconnect SSE...')
              connectSSE()
            }
          }, 5000)
        }

        eventSourceRef.current = eventSource
      } catch (error) {
        console.error('❌ Failed to create SSE connection:', error)
      }
    }

    const handleNewNotification = (notification: any) => {
      // Show toast notification
      const icon = getNotificationIcon(notification.type)
      
      if (notification.type === 'task_overdue') {
        toast.error(notification.message, {
          duration: 5000,
          icon: icon,
        })
      } else if (notification.type === 'task_completed') {
        toast.success(notification.message, {
          duration: 4000,
          icon: icon,
        })
      } else {
        toast(notification.message, {
          duration: 4000,
          icon: icon,
        })
      }

      // Refresh the notification data
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    }

    const getNotificationIcon = (type: NotificationType) => {
      switch (type) {
        case 'task_overdue': return '⚠️'
        case 'task_assigned': return '📋'
        case 'task_completed': return '✅'
        case 'task_updated': return '🔄'
        case 'comment_added': return '💬'
        case 'review_written': return '📝'
        case 'chat_message': return '💬'
        case 'project_update': return '📊'
        case 'test': return '🧪'
        default: return '🔔'
      }
    }

    // Connect SSE
    connectSSE()

    // Cleanup on unmount
    return () => {
      console.log('🛑 Cleaning up real-time notification service')
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [user, queryClient])

  // This component doesn't render anything
  return null
}