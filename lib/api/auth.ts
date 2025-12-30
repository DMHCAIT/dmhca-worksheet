import { apiClient } from './client'
import { LoginRequest, LoginResponse, RegisterRequest, User, ApiResponse } from '@/types'
import { loginResponseSchema, userResponseSchema } from '@/lib/schemas'
import Cookies from 'js-cookie'

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    const validated = loginResponseSchema.parse(response.data)
    
    // Store token in both localStorage and cookies
    if (validated.token) {
      localStorage.setItem('authToken', validated.token)
      // Map team to department for frontend compatibility
      const userWithDepartment = {
        ...validated.user,
        department: (validated.user as any).team || (validated.user as any).department
      }
      localStorage.setItem('user', JSON.stringify(userWithDepartment))
      Cookies.set('authToken', validated.token, { expires: 7, secure: true, sameSite: 'strict' })
    }
    
    return validated
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    // Map department to team for backend compatibility
    const backendData = {
      ...data,
      team: data.department || 'general'
    }
    const response = await apiClient.post<LoginResponse>('/auth/register', backendData)
    const validated = loginResponseSchema.parse(response.data)
    
    // Store token in both localStorage and cookies
    if (validated.token) {
      localStorage.setItem('authToken', validated.token)
      // Map team to department for frontend compatibility
      const userWithDepartment = {
        ...validated.user,
        department: (validated.user as any).team || (validated.user as any).department
      }
      localStorage.setItem('user', JSON.stringify(userWithDepartment))
      Cookies.set('authToken', validated.token, { expires: 7, secure: true, sameSite: 'strict' })
    }
    
    return validated
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me')
    const validated = userResponseSchema.parse(response.data)
    return validated.data
  },

  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    Cookies.remove('authToken')
  },
}
