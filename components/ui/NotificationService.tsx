'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useQueryClient } from '@tanstack/react-query'
import { notificationKeys } from '@/lib/hooks/useNotifications'
import toast from 'react-hot-toast'

export default function NotificationService() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const lastNotificationCheck = useRef<Date>(new Date())

  useEffect(() => {
    if (!user) return

    // Check for new notifications more frequently
    const checkNotifications = async () => {
      try {
        console.log('🔍 Checking for new notifications...')
        
        // Get notifications created since last check
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications?since=${lastNotificationCheck.current.toISOString()}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const notifications = await response.json()
          
          if (notifications.length > 0) {
            console.log('✅ Found new notifications:', notifications.length)
            
            // Show toast for new notifications
            notifications.forEach((notification: any) => {
              const icon = getNotificationIcon(notification.type)
              
              if (notification.type === 'task_overdue') {
                toast.error(notification.message, {
                  duration: 5000,
                  icon: icon,
                })
              } else {
                toast(notification.message, {
                  duration: 4000,
                  icon: icon,
                })
              }

              // Show Chrome browser notification if permission is granted
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  const browserNotification = new Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: `dmhca-poll-${notification.id}`,
                    requireInteraction: notification.type === 'task_overdue',
                    silent: false
                  })

                  // Auto-close notification after 5 seconds (except overdue tasks)
                  if (notification.type !== 'task_overdue') {
                    setTimeout(() => {
                      browserNotification.close()
                    }, 5000)
                  }

                  browserNotification.onclick = () => {
                    window.focus()
                    browserNotification.close()
                  }
                } catch (error) {
                  console.error('❌ Failed to show browser notification:', error)
                }
              }
            })

            // Refresh the notification data
            queryClient.invalidateQueries({ queryKey: notificationKeys.all })
          }
        } else if (response.status !== 304) {
          console.error('❌ Notification check failed:', response.status, response.statusText)
        }
        
        lastNotificationCheck.current = new Date()
      } catch (error) {
        console.error('Error checking notifications:', error)
      }
    }

    // Check for overdue tasks every 5 minutes
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
            
            // Show Chrome browser notification for overdue tasks
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const browserNotification = new Notification('Overdue Tasks Alert', {
                  body: `You have ${result.notificationsCreated} overdue task${result.notificationsCreated > 1 ? 's' : ''}!`,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: 'dmhca-overdue-tasks',
                  requireInteraction: true, // Keep visible until clicked
                  silent: false
                })
                
                browserNotification.onclick = () => {
                  window.focus()
                  browserNotification.close()
                }
              } catch (error) {
                console.error('❌ Failed to show overdue browser notification:', error)
              }
            }
            
            queryClient.invalidateQueries({ queryKey: notificationKeys.all })
          }
        }
      } catch (error) {
        console.error('Error checking overdue tasks:', error)
      }
    }

    // Check for new chat messages every 30 seconds
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
            
            // Show Chrome browser notification for new messages
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const browserNotification = new Notification('New Messages', {
                  body: `You have ${result.notificationsCreated} new message${result.notificationsCreated > 1 ? 's' : ''}!`,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: 'dmhca-new-messages',
                  requireInteraction: false,
                  silent: false
                })
                
                // Auto-close after 5 seconds
                setTimeout(() => {
                  browserNotification.close()
                }, 5000)
                
                browserNotification.onclick = () => {
                  window.focus()
                  browserNotification.close()
                }
              } catch (error) {
                console.error('❌ Failed to show message browser notification:', error)
              }
            }
            
            queryClient.invalidateQueries({ queryKey: notificationKeys.all })
          }
        }
      } catch (error) {
        console.error('Error checking new messages:', error)
      }
    }

    // Helper function to get notification icon
    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'task_overdue': return '⚠️'
        case 'task_assigned': return '📋'
        case 'task_completed': return '✅'
        case 'task_updated': return '🔄'
        case 'comment_added': return '💬'
        case 'review_written': return '📝'
        case 'chat_message': return '💬'
        case 'project_update': return '📊'
        default: return '🔔'
      }
    }

    // Run initial checks after a delay
    const initialDelay = setTimeout(() => {
      console.log('🚀 Starting notification service for user:', user?.full_name)
      checkOverdueTasks()
      checkNewMessages()
      checkNotifications()
    }, 2000) // 2 seconds after mount

    // Set up intervals for different types of checks
    const notificationInterval = setInterval(checkNotifications, 10000) // Every 10 seconds
    const overdueInterval = setInterval(checkOverdueTasks, 5 * 60 * 1000) // Every 5 minutes
    const messageInterval = setInterval(checkNewMessages, 30 * 1000) // Every 30 seconds

    console.log('⏰ Notification intervals set up')

    return () => {
      clearTimeout(initialDelay)
      clearInterval(notificationInterval)
      clearInterval(overdueInterval)
      clearInterval(messageInterval)
      console.log('🛑 Notification service cleanup')
    }
  }, [user, queryClient])

  // This component doesn't render anything
  return null
}