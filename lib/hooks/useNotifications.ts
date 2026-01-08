import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Notification } from '@/types/entities'
import { notificationsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
}

// Get all notifications
export function useNotifications() {
  return useQuery<Notification[], Error>({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsApi.getNotifications(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 5 * 1000, // Consider data stale after 5 seconds
  })
}

// Get unread notification count
export function useUnreadNotificationCount() {
  const { data: notifications } = useNotifications()
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0
  return { unreadCount }
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Mark all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Check for overdue tasks and create notifications
export function useCheckOverdueTasks() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // This would be implemented on the backend to check overdue tasks
      // and create notifications
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/check-overdue-tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to check overdue tasks')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}