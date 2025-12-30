import { apiClient } from './client'

export const reportsApi = {
  async getAll() {
    const response = await apiClient.get('/reports')
    return response.data.data || []
  },
  async getDashboard() {
    const response = await apiClient.get('/reports/dashboard')
    return response.data.data || {}
  },
  async getProjectStats() {
    const response = await apiClient.get('/reports/project-stats')
    return response.data.data || []
  },
  async getTeamPerformance() {
    const response = await apiClient.get('/reports/team-performance')
    return response.data.data || []
  },
}

export const projectionsApi = {
  async getAll() {
    const response = await apiClient.get('/projections')
    return response.data.data || []
  },
  async createProjection(data: any) {
    const response = await apiClient.post('/projections', data)
    return response.data.data
  },
  async updateProjection(id: number, data: any) {
    const response = await apiClient.put(`/projections/${id}`, data)
    return response.data.data
  },
  async deleteProjection(id: number) {
    await apiClient.delete(`/projections/${id}`)
  },
}

export const notificationsApi = {
  async getAll() {
    const response = await apiClient.get('/notifications')
    return response.data.data || []
  },
}
