import axios from 'axios'

// Ensure we always have /api suffix
const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  // Remove trailing slash if present, then add /api
  return `${baseUrl.replace(/\/$/, '')}/api`
}

const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth functions
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users')
    return response.data.users || response.data || []
  },

  get: async (id: string) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  create: async (userData: any) => {
    const response = await api.post('/users', userData)
    return response.data
  },

  update: async (id: string, userData: any) => {
    const response = await api.put(`/users/${id}`, userData)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },

  changePassword: async (passwordData: any) => {
    const response = await api.put('/users/change-password', passwordData)
    return response.data
  },

  getStats: async (id: string) => {
    const response = await api.get(`/users/${id}/stats`)
    return response.data
  }
}

// Projects API
export const projectsAPI = {
  getAll: async () => {
    const response = await api.get('/projects')
    return response.data.projects || response.data || []
  },

  getProjects: async () => {
    const response = await api.get('/projects')
    return response.data
  },

  getById: async (id: number) => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  create: async (projectData: any) => {
    const response = await api.post('/projects', projectData)
    return response.data
  },

  update: async (id: number, projectData: any) => {
    const response = await api.put(`/projects/${id}`, projectData)
    return response.data
  },

  delete: async (id: number) => {
    const response = await api.delete(`/projects/${id}`)
    return response.data
  }
}

// Tasks API
export const tasksAPI = {
  getAll: async () => {
    const response = await api.get('/tasks')
    return response.data.tasks || response.data || []
  },

  getTasks: async (params?: { limit?: number; sort?: string; order?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.sort) queryParams.append('sort', params.sort)
    if (params?.order) queryParams.append('order', params.order)
    
    const response = await api.get(`/tasks?${queryParams.toString()}`)
    return response.data
  },

  getById: async (id: number) => {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },

  create: async (taskData: any) => {
    const response = await api.post('/tasks', taskData)
    return response.data
  },

  update: async (id: number, taskData: any) => {
    const response = await api.put(`/tasks/${id}`, taskData)
    return response.data
  },

  delete: async (id: number) => {
    const response = await api.delete(`/tasks/${id}`)
    return response.data
  }
}

// Work Projections API
export const projectionsAPI = {
  getAll: async () => {
    const response = await api.get('/projections')
    return response.data.projections || response.data || []
  },

  create: async (projectionData: any) => {
    const response = await api.post('/projections', projectionData)
    return response.data
  },

  update: async (id: number, projectionData: any) => {
    const response = await api.put(`/projections/${id}`, projectionData)
    return response.data
  }
}

// Reports API
export const reportsAPI = {
  getDashboard: async () => {
    const response = await api.get('/reports/dashboard')
    return response.data
  },

  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard')
    return response.data
  },

  getProjectStats: async () => {
    const response = await api.get('/reports/projects')
    return Array.isArray(response.data) ? response.data : response.data.projects || []
  },

  getTeamPerformance: async () => {
    const response = await api.get('/reports/team-performance')
    return Array.isArray(response.data) ? response.data : response.data.teams || []
  }
}

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    const response = await api.get('/notifications')
    return response.data
  },

  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read')
    return response.data
  }
}