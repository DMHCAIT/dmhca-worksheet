import { apiClient } from './client'
import { 
  Project, 
  CreateProjectRequest, 
  UpdateProjectRequest,
  ApiResponse 
} from '@/types'
import { projectsResponseSchema, projectResponseSchema } from '@/lib/schemas'

export const projectsApi = {
  async getAll(): Promise<Project[]> {
    const response = await apiClient.get<ApiResponse<Project[]>>('/projects')
    const validated = projectsResponseSchema.parse(response.data)
    return validated.data
  },

  async getById(id: number): Promise<Project> {
    const response = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`)
    const validated = projectResponseSchema.parse(response.data)
    return validated.data
  },

  async create(data: CreateProjectRequest): Promise<Project> {
    const response = await apiClient.post<ApiResponse<Project>>('/projects', data)
    const validated = projectResponseSchema.parse(response.data)
    return validated.data
  },

  async update(id: number, data: UpdateProjectRequest): Promise<Project> {
    const response = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data)
    const validated = projectResponseSchema.parse(response.data)
    return validated.data
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/projects/${id}`)
  },
}
