import { apiClient } from './client'
import { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest,
  ApiResponse 
} from '@/types'
import { usersResponseSchema, userResponseSchema } from '@/lib/schemas'

export const usersApi = {
  async getAll(): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/users')
    const validated = usersResponseSchema.parse(response.data)
    // Map team to department for frontend compatibility
    return validated.data.map((user: any) => ({
      ...user,
      department: user.team || user.department
    }))
  },

  async getById(id: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<any>>(`/users/${id}`)
    const validated = userResponseSchema.parse(response.data)
    // Map team to department for frontend compatibility
    return {
      ...validated.data,
      department: (validated.data as any).team || validated.data.department
    } as User
  },

  async create(data: CreateUserRequest): Promise<User> {
    // Map department to team for backend compatibility
    const backendData = {
      ...data,
      team: data.department || 'general'
    }
    const response = await apiClient.post<ApiResponse<any>>('/users', backendData)
    const validated = userResponseSchema.parse(response.data)
    // Map team to department for frontend compatibility
    return {
      ...validated.data,
      department: (validated.data as any).team || validated.data.department
    } as User
  },

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    // Map department to team for backend compatibility
    const backendData = data.department ? {
      ...data,
      team: data.department
    } : data
    const response = await apiClient.put<ApiResponse<any>>(`/users/${id}`, backendData)
    const validated = userResponseSchema.parse(response.data)
    // Map team to department for frontend compatibility
    return {
      ...validated.data,
      department: (validated.data as any).team || validated.data.department
    } as User
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`)
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await apiClient.post('/users/change-password', data)
  },
}
