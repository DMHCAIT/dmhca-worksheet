// API request and response type definitions

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    field_errors?: Record<string, string[]>
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Auth API types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token: string
  user: {
    id: string
    email: string
    full_name: string
    role: string
  }
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  role?: string
  department?: string
}

// Project API types
export interface CreateProjectRequest {
  name: string
  description: string
  status?: string
  start_date: string
  end_date?: string | null
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: string
  start_date?: string
  end_date?: string | null
  deadline?: string | null
}

// Task API types
export interface CreateTaskRequest {
  title: string
  description: string
  status?: string
  priority?: string
  project_id?: number | null
  assigned_to?: string
  deadline?: string | null
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: string
  priority?: string
  project_id?: number | null
  assigned_to?: string
  deadline?: string | null
}

// User API types
export interface CreateUserRequest {
  email: string
  password: string
  full_name: string
  role: string
  department?: string
  phone?: string
  branch_id?: number | null
}

export interface UpdateUserRequest {
  email?: string
  full_name?: string
  role?: string
  department?: string
  phone?: string
  branch_id?: number | null
}
