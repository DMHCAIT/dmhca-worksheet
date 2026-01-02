import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo } from 'react'
// import { tasksApi } from '@/lib/api'
import { Task, TaskFilters, CreateTaskForm, UpdateTaskForm } from '@/types/enhanced'
import { ApiError, PaginatedResponse } from '@/types/api'

// This is a demonstration of optimized data fetching patterns
// In a real implementation, these would integrate with the existing API

// Query key factory for consistent cache management
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
  analytics: () => [...taskKeys.all, 'analytics'] as const,
  comments: (taskId: number) => [...taskKeys.detail(taskId), 'comments'] as const,
  attachments: (taskId: number) => [...taskKeys.detail(taskId), 'attachments'] as const,
}

/*
// Enhanced task list hook with optimized caching
export function useTasksOptimized(filters: TaskFilters = {}, enabled = true) {
  const queryClient = useQueryClient()
  
  // Memoize query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => taskKeys.list(filters), [filters])
  
  const query = useQuery<PaginatedResponse<Task>, ApiError>({
    queryKey,
    queryFn: () => tasksApi.getTasks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled,
    retry: (failureCount, error) => {
      if (error.error?.code === 'UNAUTHORIZED') return false
      return failureCount < 3
    },
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  })

  // Rest of implementation...
  return query
}
*/

// Example of how to structure optimized hooks
export function useOptimizedDataPattern() {
  const queryClient = useQueryClient()
  
  const optimizedQuery = {
    // Smart caching with stale-while-revalidate
    staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    
    // Intelligent retries
    retry: (failureCount: number, error: any) => {
      if (error?.response?.status === 401) return false
      return failureCount < 3
    },
    
    // Performance optimizations
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  }

  return {
    queryConfig: optimizedQuery,
    cacheKeys: taskKeys,
  }
}

/*
// Enhanced task detail hook with related data prefetching
export function useTaskDetail(id: number, enabled = true) {
  // Implementation commented out for demo - would integrate with existing API
}

// Optimized mutations with cache updates  
export function useCreateTaskOptimized() {
  // Implementation commented out for demo
}

export function useUpdateTaskOptimized() {
  // Implementation commented out for demo
}

export function useDeleteTaskOptimized() {
  // Implementation commented out for demo
}

// Bulk operations hook
export function useBulkTaskOperations() {
  // Implementation commented out for demo
}

// Hook for infinite scrolling
export function useInfiniteTasksOptimized(filters: TaskFilters = {}) {
  // Implementation commented out for demo
}

// Background sync hook for real-time updates
export function useTasksBackgroundSync(enabled = true) {
  // Implementation commented out for demo
}
*/