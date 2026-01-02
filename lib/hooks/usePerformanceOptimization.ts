/**
 * Performance Optimization Utilities
 * Provides intelligent polling management and visibility-aware data fetching
 */

import { useEffect, useRef, useState, useCallback } from 'react'

// Optimized polling intervals (increased from aggressive 2-10 seconds)
export const POLLING_INTERVALS = {
  critical: 30000,    // 30 seconds for critical real-time data
  important: 60000,   // 1 minute for important updates
  normal: 300000,     // 5 minutes for normal data
  background: 900000, // 15 minutes for background sync
} as const

export type PollingPriority = keyof typeof POLLING_INTERVALS

/**
 * Hook for managing page visibility state
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isVisible
}

/**
 * Hook for intelligent polling that adapts based on page visibility
 */
export function useAdaptivePolling(
  callback: () => void,
  priority: PollingPriority = 'normal',
  dependencies: any[] = []
) {
  const isVisible = usePageVisibility()
  const intervalRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const startPolling = useCallback((interval: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      callbackRef.current()
    }, interval)
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
  }, [])

  useEffect(() => {
    if (isVisible) {
      // Use normal interval when page is visible
      const interval = POLLING_INTERVALS[priority]
      startPolling(interval)
    } else {
      // Use longer interval when page is hidden (or stop entirely for non-critical data)
      if (priority === 'critical') {
        startPolling(POLLING_INTERVALS.background)
      } else {
        stopPolling()
      }
    }

    return stopPolling
  }, [isVisible, priority, startPolling, stopPolling, ...dependencies])

  return { isVisible, startPolling, stopPolling }
}

/**
 * Hook for React Query with adaptive polling
 */
export function useAdaptiveQueryOptions(
  priority: PollingPriority = 'normal',
  enabled: boolean = true
) {
  const isVisible = usePageVisibility()

  const refetchInterval = isVisible ? POLLING_INTERVALS[priority] : (
    priority === 'critical' ? POLLING_INTERVALS.background : false
  )

  return {
    enabled,
    refetchInterval,
    refetchIntervalInBackground: priority === 'critical',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: POLLING_INTERVALS[priority] / 2, // Consider data stale after half the polling interval
  }
}

/**
 * Debounced function to prevent excessive API calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Throttled function to limit API call frequency
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallTime = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCallTime.current >= delay) {
      lastCallTime.current = now
      return callback(...args)
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallTime.current = Date.now()
        callback(...args)
      }, delay - (now - lastCallTime.current))
    }
  }, [callback, delay]) as T
}

/**
 * Smart caching hook that invalidates based on data freshness
 */
export function useSmartCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    maxAge?: number // milliseconds
    priority?: PollingPriority
  } = {}
) {
  const { maxAge = POLLING_INTERVALS.normal, priority = 'normal' } = options
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null)
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetchFn()
      
      cacheRef.current = {
        data: result,
        timestamp: Date.now()
      }
      
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn])

  const getCachedData = useCallback(() => {
    if (!cacheRef.current) return null
    
    const now = Date.now()
    const age = now - cacheRef.current.timestamp
    
    if (age > maxAge) {
      return null // Cache expired
    }
    
    return cacheRef.current.data
  }, [maxAge])

  // Use adaptive polling for auto-refresh
  useAdaptivePolling(
    () => {
      const cachedData = getCachedData()
      if (!cachedData) {
        refresh()
      }
    },
    priority,
    [refresh, getCachedData]
  )

  // Initial load
  useEffect(() => {
    const cachedData = getCachedData()
    if (cachedData) {
      setData(cachedData)
    } else {
      refresh()
    }
  }, [getCachedData, refresh])

  return {
    data,
    isLoading,
    error,
    refresh,
    getCachedData
  }
}

/**
 * Performance monitoring hook for debugging
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(Date.now())

  useEffect(() => {
    renderCount.current += 1
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    
    // Log excessive re-renders (more than once per second)
    if (timeSinceLastRender < 1000 && renderCount.current > 1) {
      console.warn(
        `⚠️ Performance Warning: ${componentName} re-rendered ${renderCount.current} times in ${timeSinceLastRender}ms`
      )
    }
    
    // Reset counter every 10 seconds
    if (timeSinceLastRender > 10000) {
      renderCount.current = 1
    }
    
    lastRenderTime.current = now
  })

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  }
}