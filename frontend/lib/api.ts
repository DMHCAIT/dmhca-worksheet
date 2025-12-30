import axios from 'axios'

// Ensure we always have /api suffix
const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  // Remove trailing slash if present, then add /api
  return `${baseUrl.replace(/\/$/, '')}/api`
}

const API_BASE_URL = getApiBaseUrl()

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth token and redirect to login
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API functions
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData: {
    email: string
    password: string
    full_name: string
    team: string
    role: string
  }) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh')
    return response.data
  }
}

// Users API
export const usersApi = {
  getUsers: async () => {
    const response = await api.get('/users')
    return response.data
  },

  getAll: async () => {
    const response = await api.get('/users')
    return response.data
  },

  getUser: async (id: string) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await api.post('/users', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },

  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },

  changePassword: async (data: { currentPassword: string, newPassword: string }) => {
    const response = await api.put('/auth/change-password', data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  }
}

// Projects API
export const projectsApi = {
  getProjects: async () => {
    const response = await api.get('/projects')
    return response.data
  },

  getAll: async () => {
    const response = await api.get('/projects')
    return response.data
  },

  getProject: async (id: string) => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await api.post('/projects', data)
    return response.data
  },

  createProject: async (data: any) => {
    const response = await api.post('/projects', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/projects/${id}`, data)
    return response.data
  },

  updateProject: async (id: string, data: any) => {
    const response = await api.put(`/projects/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/projects/${id}`)
    return response.data
  },

  deleteProject: async (id: string) => {
    const response = await api.delete(`/projects/${id}`)
    return response.data
  }
}

// Tasks API
export const tasksApi = {
  getTasks: async (params?: any) => {
    const searchParams = new URLSearchParams(params || {})
    const response = await api.get(`/tasks?${searchParams}`)
    return response.data
  },

  getAll: async () => {
    const response = await api.get('/tasks')
    return response.data
  },

  getTask: async (id: string) => {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await api.post('/tasks', data)
    return response.data
  },

  createTask: async (data: any) => {
    const response = await api.post('/tasks', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/tasks/${id}`, data)
    return response.data
  },

  updateTask: async (id: string, data: any) => {
    const response = await api.put(`/tasks/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`)
    return response.data
  },

  deleteTask: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`)
    return response.data
  }
}

// Reports API
export const reportsApi = {
  getDashboard: async () => {
    const response = await api.get('/reports/dashboard')
    return response.data
  },

  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard')
    return response.data
  },

  getReports: async () => {
    const response = await api.get('/reports')
    return response.data
  },

  getTeamProductivity: async () => {
    const response = await api.get('/reports/team-productivity')
    return response.data
  },

  getProjectProgress: async () => {
    const response = await api.get('/reports/project-progress')
    return response.data
  },

  getProjectStats: async () => {
    const response = await api.get('/reports/project-stats')
    return response.data
  },

  getTeamPerformance: async () => {
    const response = await api.get('/reports/team-performance')
    return response.data
  },

  getWorkloadAnalysis: async () => {
    const response = await api.get('/reports/workload-analysis')
    return response.data
  }
}

// Projections API
export const projectionsApi = {
  getProjections: async () => {
    const response = await api.get('/projections')
    return response.data
  },

  getAll: async () => {
    const response = await api.get('/projections')
    return response.data
  },

  createProjection: async (data: any) => {
    const response = await api.post('/projections', data)
    return response.data
  },

  updateProjection: async (id: string, data: any) => {
    const response = await api.put(`/projections/${id}`, data)
    return response.data
  },

  deleteProjection: async (id: string) => {
    const response = await api.delete(`/projections/${id}`)
    return response.data
  }
}

// Notifications API
export const notificationsApi = {
  getNotifications: async () => {
    const response = await api.get('/notifications')
    return response.data
  },

  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all')
    return response.data
  }
}

export default api