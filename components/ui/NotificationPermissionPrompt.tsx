'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NotificationPermissionPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      
      // Show prompt if permission is default and user hasn't dismissed it
      const dismissed = localStorage.getItem('notification-prompt-dismissed')
      if (Notification.permission === 'default' && !dismissed) {
        // Show prompt after 5 seconds to not be too intrusive
        setTimeout(() => setShowPrompt(true), 5000)
      }
    }
  }, [])

  const requestPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        setPermission(permission)
        
        if (permission === 'granted') {
          toast.success('Browser notifications enabled! You\'ll now get real-time alerts.', {
            duration: 4000,
            icon: '🔔',
          })
          
          // Show a test notification
          setTimeout(() => {
            new Notification('DMHCA Work Tracker', {
              body: 'Browser notifications are now enabled for real-time updates!',
              icon: '/favicon.ico',
              tag: 'dmhca-test-notification'
            })
          }, 1000)
        } else if (permission === 'denied') {
          toast.error('Browser notifications disabled. You can enable them later in browser settings.', {
            duration: 5000,
            icon: '🔕',
          })
        }
        
        setShowPrompt(false)
      } catch (error) {
        console.error('Error requesting notification permission:', error)
      }
    }
  }

  const dismissPrompt = () => {
    setShowPrompt(false)
    localStorage.setItem('notification-prompt-dismissed', 'true')
  }

  if (!('Notification' in window) || permission === 'granted' || !showPrompt) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Enable Real-time Notifications
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Get instant alerts for task updates, comments, and important deadlines even when the tab is not active.
          </p>
          <div className="flex gap-2">
            <button
              onClick={requestPermission}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              <Check className="w-3 h-3" />
              Enable
            </button>
            <button
              onClick={dismissPrompt}
              className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
            >
              <X className="w-3 h-3" />
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}