import { apiClient } from './client'
import { 
  Project, 
  CreateProjectRequest, 
  UpdateProjectRequest,
  ApiResponse 
} from '@/types'
import { projectsResponseSchema, projectResponseSchema } from '@/lib/schemas'

interface ProjectAttachment {
  id: number
  project_id: number
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  description?: string
  uploaded_by: string
  created_at: string
}

interface ProjectMember {
  id: number
  project_id: number
  user_id: string
  role: string
  added_at: string
  user?: {
    id: string
    full_name: string
    email: string
  }
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  team?: string
}

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

  // Legacy method for backward compatibility
  async getProject(id: string): Promise<Project> {
    return this.getById(parseInt(id))
  },

  async create(data: CreateProjectRequest): Promise<Project> {
    const response = await apiClient.post<ApiResponse<Project>>('/projects', data)
    const validated = projectResponseSchema.parse(response.data)
    return validated.data
  },

  async update(id: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data)
    const validated = projectResponseSchema.parse(response.data)
    return validated.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`)
  },

  // Project Attachments
  async getAttachments(projectId: number): Promise<ProjectAttachment[]> {
    const response = await apiClient.get<ApiResponse<ProjectAttachment[]>>(`/projects/${projectId}/attachments`)
    return response.data.data
  },

  async uploadAttachment(projectId: number, file: File): Promise<ProjectAttachment> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post<ApiResponse<ProjectAttachment>>(
      `/projects/${projectId}/attachments`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.data
  },

  async deleteAttachment(projectId: number, attachmentId: number): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/attachments/${attachmentId}`)
  },

  // Project Members  
  async getMembers(projectId: number): Promise<ProjectMember[]> {
    const response = await apiClient.get<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`)
    return response.data.data
  },

  async addMember(projectId: number, userId: string, role: string): Promise<ProjectMember> {
    const response = await apiClient.post<ApiResponse<ProjectMember>>(
      `/projects/${projectId}/members`, 
      { userId, role }
    )
    return response.data.data
  },

  async removeMember(projectId: number, memberId: number): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/members/${memberId}`)
  },

  // Get user profiles for member management
  async getProfiles(): Promise<UserProfile[]> {
    const response = await apiClient.get<ApiResponse<UserProfile[]>>('/users/profiles')
    return response.data.data
  },
}
