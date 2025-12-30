'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { projectionsApi, projectsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'
import toast from 'react-hot-toast'

interface WorkProjection {
  id: number
  week_start_date: string
  week_end_date: string
  project_id: number
  user_id: string
  team: string
  estimated_hours: number
  actual_hours?: number
  status: string
  notes?: string
  created_at: string
  project?: { name: string }
  user?: { full_name: string }
}

interface Project {
  id: number
  name: string
  team: string
}

export default function ProjectionsPage() {
  const [projections, setProjections] = useState<WorkProjection[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [newProjection, setNewProjection] = useState({
    week_start_date: '',
    project_id: '',
    estimated_hours: '',
    notes: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchProjections()
    fetchProjects()
    setCurrentWeek()
  }, [])

  const setCurrentWeek = () => {
    const today = new Date()
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1))
    const weekStart = monday.toISOString().split('T')[0]
    setSelectedWeek(weekStart)
  }

  const fetchProjections = async () => {
    try {
      const data = await projectionsApi.getAll()
      setProjections(data)
    } catch (error) {
      console.error('Error fetching projections:', error)
      toast.error('Failed to fetch work projections')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const data = await projectsApi.getAll()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleCreateProjection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const weekStartDate = new Date(newProjection.week_start_date)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)

    const projectionData = {
      ...newProjection,
      week_end_date: weekEndDate.toISOString().split('T')[0],
      user_id: user.id,
      team: user.team,
      estimated_hours: parseInt(newProjection.estimated_hours)
    }

    try {
      await projectionsApi.createProjection(projectionData)
      toast.success('Work projection created successfully!')
      setShowCreateModal(false)
      setNewProjection({
        week_start_date: '',
        project_id: '',
        estimated_hours: '',
        notes: ''
      })
      fetchProjections()
    } catch (error) {
      toast.error('Failed to create work projection')
    }
  }

  const handleUpdateActualHours = async (id: number, actualHours: number) => {
    try {
      await projectionsApi.updateProjection(id.toString(), { actual_hours: actualHours })
      toast.success('Actual hours updated!')
      fetchProjections()
    } catch (error) {
      toast.error('Failed to update actual hours')
    }
  }

  const getWeeklyProjections = (weekStart: string) => {
    return projections.filter(p => p.week_start_date === weekStart)
  }

  const getWeekDates = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
      start: start.toLocaleDateString(),
      end: end.toLocaleDateString()
    }
  }

  const getCurrentWeekProjections = () => {
    return getWeeklyProjections(selectedWeek)
  }

  const getTotalEstimatedHours = (weekProjections: WorkProjection[]) => {
    return weekProjections.reduce((total, p) => total + p.estimated_hours, 0)
  }

  const getTotalActualHours = (weekProjections: WorkProjection[]) => {
    return weekProjections.reduce((total, p) => total + (p.actual_hours || 0), 0)
  }

  const getVariance = (estimated: number, actual: number) => {
    return actual - estimated
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading work projections...</div>
        </div>
      </DashboardLayout>
    )
  }

  const currentWeekProjections = getCurrentWeekProjections()
  const totalEstimated = getTotalEstimatedHours(currentWeekProjections)
  const totalActual = getTotalActualHours(currentWeekProjections)
  const variance = getVariance(totalEstimated, totalActual)

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Projections</h1>
          <p className="text-gray-600">Plan and track your weekly work commitments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          Add Projection
        </button>
      </div>

      {/* Week Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Week</h2>
            <p className="text-gray-600">Choose a week to view projections</p>
          </div>
          <input
            type="date"
            className="input"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          />
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Week Range</h3>
          <p className="text-sm text-gray-600">
            {getWeekDates(selectedWeek).start} - {getWeekDates(selectedWeek).end}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Estimated Hours</h3>
          <p className="text-2xl font-bold text-blue-600">{totalEstimated}h</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Actual Hours</h3>
          <p className="text-2xl font-bold text-green-600">{totalActual}h</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Variance</h3>
          <p className={`text-2xl font-bold ${variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {variance >= 0 ? '+' : ''}{variance}h
          </p>
        </div>
      </div>

      {/* Projections List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Week of {getWeekDates(selectedWeek).start}
          </h2>
        </div>

        {currentWeekProjections.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projections for this week</h3>
            <p className="text-gray-500 mb-4">Add your first work projection to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Add Projection
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimated Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentWeekProjections.map((projection) => (
                  <tr key={projection.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {projection.project?.name || 'Unknown Project'}
                      </div>
                      <div className="text-sm text-gray-500">{projection.team}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{projection.estimated_hours}h</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                        value={projection.actual_hours || ''}
                        onChange={(e) => handleUpdateActualHours(projection.id, parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        projection.status === 'completed' ? 'bg-green-100 text-green-800' :
                        projection.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {projection.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {projection.notes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Projection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateProjection}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add Work Projection</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Week Start Date</label>
                      <input
                        type="date"
                        required
                        className="input mt-1"
                        value={newProjection.week_start_date}
                        onChange={(e) => setNewProjection({ ...newProjection, week_start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Project</label>
                      <select
                        required
                        className="input mt-1"
                        value={newProjection.project_id}
                        onChange={(e) => setNewProjection({ ...newProjection, project_id: e.target.value })}
                      >
                        <option value="">Select Project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="40"
                        className="input mt-1"
                        value={newProjection.estimated_hours}
                        onChange={(e) => setNewProjection({ ...newProjection, estimated_hours: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        className="input mt-1"
                        rows={3}
                        value={newProjection.notes}
                        onChange={(e) => setNewProjection({ ...newProjection, notes: e.target.value })}
                        placeholder="Additional details about this projection..."
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary sm:ml-3">
                    Add Projection
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}