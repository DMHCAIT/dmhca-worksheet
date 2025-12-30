import { apiClient } from './client'
import { 
  Task, 
  TaskComment,
  TaskAttachment,
  CreateTaskRequest, 
  UpdateTaskRequest,
  ApiResponse 
} from '@/types'
import { tasksResponseSchema, taskResponseSchema } from '@/lib/schemas'

export const tasksApi = {
  async getAll(): Promise<Task[]> {
    const response = await apiClient.get<ApiResponse<Task[]>>('/tasks')
    const validated = tasksResponseSchema.parse(response.data)
    return validated.data
  },

  async getById(id: number): Promise<Task> {
    const response = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`)
    const validated = taskResponseSchema.parse(response.data)
    return validated.data
  },

  async create(data: CreateTaskRequest): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>('/tasks', data)
    const validated = taskResponseSchema.parse(response.data)
    return validated.data
  },

  async update(id: number, data: UpdateTaskRequest): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, data)
    const validated = taskResponseSchema.parse(response.data)
    return validated.data
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/tasks/${id}`)
  },

  async addComment(taskId: number, comment: string): Promise<TaskComment> {
    const response = await apiClient.post<ApiResponse<TaskComment>>(`/tasks/${taskId}/comments`, { comment })
    return response.data.data
  },

  async addAttachment(taskId: number, attachment: { file_name: string; file_url: string; file_size?: number }): Promise<TaskAttachment> {
    const response = await apiClient.post<ApiResponse<TaskAttachment>>(`/tasks/${taskId}/attachments`, attachment)
    return response.data.data
  },

  async deleteAttachment(taskId: number, attachmentId: number): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`)
  },
}
