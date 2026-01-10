'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/lib/hooks/useNotifications'
import { Notification } from '@/types/entities'
import toast from 'react-hot-toast'

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { data: notifications = [], isLoading } = useNotifications()
  const { unreadCount } = useUnreadNotificationCount()
  const markAsRead = useMarkNotificationRead()
  const markAllAsRead = useMarkAllNotificationsRead()

  // Debug logging
  useEffect(() => {
    console.log('🔔 NotificationBell mounted')
    console.log('📊 Notifications data:', notifications)
    console.log('📈 Unread count:', unreadCount)
  }, [notifications, unreadCount])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await markAsRead.mutateAsync(id)
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return
    
    try {
      await markAllAsRead.mutateAsync()
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all notifications as read')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return `${minutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      const days = Math.floor(diffInHours / 24)
      return `${days}d ago`
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_overdue':
        return '⚠️'
      case 'task_assigned':
        return '📋'
      case 'task_completed':
        return '✅'
      case 'task_updated':
        return '🔄'
      case 'comment_added':
        return '💬'
      case 'review_written':
        return '📝'
      case 'chat_message':
        return '💬'
      case 'project_update':
        return '📊'
      case 'test':
        return '🧪'
      default:
        return '🔔'
    }
  }

  const handleCreateTestNotification = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        toast.success('Test notification created!')
        // Refresh notifications
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error('Failed to create test notification')
      }
    } catch (error) {
      console.error('Test notification error:', error)
      toast.error('Error creating test notification')
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
        title={`${unreadCount} unread notifications`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {/* Test button for debugging */}
                <button
                  onClick={handleCreateTestNotification}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                  title="Create test notification"
                >
                  Test
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsRead.isPending}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    formatTime={formatTime}
                    getIcon={getNotificationIcon}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false)
                  // Navigate to notifications page if you have one
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: number, event: React.MouseEvent) => void
  formatTime: (dateString: string) => string
  getIcon: (type: string) => string
}

function NotificationItem({ notification, onMarkAsRead, formatTime, getIcon }: NotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLongMessage = notification.message.length > 100

  return (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-blue-50 border-l-4 border-blue-400' : ''
      }`}
      onClick={() => isLongMessage && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{getIcon(notification.type)}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {notification.title}
          </h4>
          <div className="text-sm text-gray-600">
            {isLongMessage && !isExpanded ? (
              <>
                <p className="mb-1">
                  {notification.message.substring(0, 80)}...
                </p>
                <button 
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(true)
                  }}
                >
                  Show more
                </button>
              </>
            ) : (
              <>
                <p className="whitespace-pre-wrap break-words">
                  {notification.message}
                </p>
                {isLongMessage && isExpanded && (
                  <button 
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsExpanded(false)
                    }}
                  >
                    Show less
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center justify-between">
            <span>{formatTime(notification.created_at)}</span>
            {notification.related_type && notification.related_id && (
              <span className="text-gray-500 text-xs">
                {notification.related_type} #{notification.related_id}
              </span>
            )}
          </p>
        </div>
        {!notification.is_read && (
          <button
            onClick={(e) => onMarkAsRead(notification.id, e)}
            className="text-blue-600 hover:text-blue-800 p-1 flex-shrink-0 transition-colors"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}