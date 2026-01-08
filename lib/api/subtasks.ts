import { apiClient } from './client'
import { 
  ProjectionSubtask, 
  SubtaskComment,
  ApiResponse 
} from '@/types'

export const subtasksApi = {
  // Get all subtasks assigned to current user
  async getMySubtasks(): Promise<ProjectionSubtask[]> {
    const response = await apiClient.get<ApiResponse<ProjectionSubtask[]>>('/projections/my-subtasks')
    return response.data.data
  },

  // Get subtasks for a specific projection
  async getByProjectionId(projectionId: number): Promise<ProjectionSubtask[]> {
    const response = await apiClient.get<ApiResponse<ProjectionSubtask[]>>(`/projections/${projectionId}/subtasks`)
    return response.data.data
  },

  // Update a subtask
  async update(id: number, data: {
    title?: string
    description?: string
    assigned_to?: string
    estimated_hours?: number
    actual_hours?: number
    status?: string
    priority?: string
    deadline?: string
  }): Promise<ProjectionSubtask> {
    const response = await apiClient.put<ApiResponse<ProjectionSubtask>>(`/projections/subtasks/${id}`, data)
    return response.data.data
  },

  // Delete a subtask
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/projections/subtasks/${id}`)
  },

  // Comment management
  async getComments(subtaskId: number): Promise<SubtaskComment[]> {
    const response = await apiClient.get<ApiResponse<SubtaskComment[]>>(`/projections/subtasks/${subtaskId}/comments`)
    return response.data.data
  },

  async addComment(subtaskId: number, comment: string): Promise<SubtaskComment> {
    const response = await apiClient.post<ApiResponse<SubtaskComment>>(`/projections/subtasks/${subtaskId}/comments`, { comment })
    return response.data.data
  },

  async updateComment(subtaskId: number, commentId: number, comment: string): Promise<SubtaskComment> {
    const response = await apiClient.put<ApiResponse<SubtaskComment>>(`/projections/subtasks/${subtaskId}/comments/${commentId}`, { comment })
    return response.data.data
  },

  async deleteComment(subtaskId: number, commentId: number): Promise<void> {
    await apiClient.delete(`/projections/subtasks/${subtaskId}/comments/${commentId}`)
  }
}