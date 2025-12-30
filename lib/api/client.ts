import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dmhca-worksheet.onrender.com'

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken') || Cookies.get('authToken')
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔵 ${config.method?.toUpperCase()} ${config.url}`, config.data || '')
    }

    return config
  },
  (error: AxiosError) => {
    console.error('❌ Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors and validate responses
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }

    // Return the data directly (React Query will handle the structure)
    return response
  },
  async (error: AxiosError<any>) => {
    const { response, config } = error

    // Log errors
    console.error('❌ API Error:', {
      url: config?.url,
      method: config?.method,
      status: response?.status,
      data: response?.data,
    })

    // Handle specific error cases
    if (response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      Cookies.remove('authToken')
      
      toast.error('Session expired. Please login again.')
      
      // Only redirect if not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (response?.status === 403) {
      toast.error('You do not have permission to perform this action.')
    } else if (response?.status === 404) {
      toast.error('Resource not found.')
    } else if (response?.status === 429) {
      toast.error('Too many requests. Please try again later.')
    } else if (response && response.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.')
    } else if (error.code === 'ERR_NETWORK') {
      toast.error('Network error. Please check your connection.')
    }

    // Return structured error
    const apiError = {
      success: false,
      error: {
        code: response?.data?.error?.code || 'UNKNOWN_ERROR',
        message: response?.data?.error?.message || response?.data?.error || error.message,
        details: response?.data?.error?.details,
      },
    }

    return Promise.reject(apiError)
  }
)

// Helper function for retry logic with exponential backoff
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on client errors (4xx)
      if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const waitTime = delay * Math.pow(2, i)
        console.log(`⏳ Retrying in ${waitTime}ms... (attempt ${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}

// Generic API helper with type safety and validation
export async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: any,
  config?: any
): Promise<T> {
  const response = await apiClient.request<T>({
    method,
    url,
    data,
    ...config,
  })

  return response.data
}
