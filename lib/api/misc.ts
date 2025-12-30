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
}

export const projectionsApi = {
  async getAll() {
    const response = await apiClient.get('/projections')
    return response.data.data || []
  },
}

export const notificationsApi = {
  async getAll() {
    const response = await apiClient.get('/notifications')
    return response.data.data || []
  },
}
