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
    const response = await apiClient.get<ApiResponse<User[]>>('/users')
    const validated = usersResponseSchema.parse(response.data)
    return validated.data
  },

  async getById(id: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
    const validated = userResponseSchema.parse(response.data)
    return validated.data
  },

  async create(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>('/users', data)
    const validated = userResponseSchema.parse(response.data)
    return validated.data
  },

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data)
    const validated = userResponseSchema.parse(response.data)
    return validated.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`)
  },
}
