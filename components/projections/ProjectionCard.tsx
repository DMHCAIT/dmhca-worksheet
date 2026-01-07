'use client'

import React, { useState, useMemo, useCallback, memo } from 'react'
import { WorkProjection } from '@/types/entities'
import { ChevronDown, ChevronUp, Plus, Edit2, Trash2, Calendar, Users } from 'lucide-react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUsers } from '@/lib/hooks'
import { usePerformanceMonitor, useAdaptiveQueryOptions } from '@/lib/hooks/usePerformanceOptimization'

interface ProjectionCardProps {
  projection: WorkProjection
  onEdit: (projection: WorkProjection) => void
  onDelete: (projection: WorkProjection) => void
  onUpdateActualHours?: (id: number, hours: number) => void
}

interface Subtask {
  id: number
  title: string
  description: string
  assigned_to: string
  assigned_user?: { full_name: string; email: string }
  estimated_hours: number
  actual_hours: number
  status: string
  priority: string
  deadline: string
}

// Memoized subtask item component to prevent unnecessary re-renders
const SubtaskItem = memo(({ 
  subtask, 
  onUpdate, 
  onDelete, 
  users 
}: { 
  subtask: Subtask
  onUpdate: (id: number, data: any) => void
  onDelete: (id: number) => void
  users: any[]
}) => {
  const [editingHours, setEditingHours] = useState(false)
  const [actualHours, setActualHours] = useState(subtask.actual_hours.toString())

  const assignedUser = useMemo(() => 
    users.find(u => u.id === subtask.assigned_to), 
    [users, subtask.assigned_to]
  )

  const handleHoursUpdate = useCallback(() => {
    const hours = parseFloat(actualHours)
    if (!isNaN(hours) && hours !== subtask.actual_hours) {
      onUpdate(subtask.id, { actual_hours: hours })
    }
    setEditingHours(false)
  }, [actualHours, subtask.actual_hours, subtask.id, onUpdate])

  const statusColor = useMemo(() => {
    switch (subtask.status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'planned': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [subtask.status])

  const priorityColor = useMemo(() => {
    switch (subtask.priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [subtask.priority])

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900">{subtask.title}</h4>
        <button
          onClick={() => onDelete(subtask.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{subtask.description}</p>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Assigned:</span> {assignedUser?.full_name || 'Unassigned'}
        </div>
        <div>
          <span className="text-gray-500">Deadline:</span> {format(new Date(subtask.deadline), 'MMM dd')}
        </div>
        <div>
          <span className="text-gray-500">Estimated:</span> {subtask.estimated_hours}h
        </div>
        <div>
          <span className="text-gray-500">Actual:</span>
          {editingHours ? (
            <input
              type="number"
              step="0.5"
              value={actualHours}
              onChange={(e) => setActualHours(e.target.value)}
              onBlur={handleHoursUpdate}
              onKeyDown={(e) => e.key === 'Enter' && handleHoursUpdate()}
              className="w-16 px-1 py-0.5 text-xs border rounded ml-1"
              autoFocus
            />
          ) : (
            <span
              onClick={() => setEditingHours(true)}
              className="cursor-pointer hover:bg-gray-200 px-1 py-0.5 rounded ml-1"
            >
              {subtask.actual_hours}h
            </span>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
          {subtask.status}
        </span>
        <span className={`px-2 py-1 text-xs rounded-full ${priorityColor}`}>
          {subtask.priority}
        </span>
      </div>
    </div>
  )
})

SubtaskItem.displayName = 'SubtaskItem'

const ProjectionCard = memo(({
  projection,
  onEdit,
  onDelete,
}: ProjectionCardProps) => {
  // Performance monitoring for debugging
  usePerformanceMonitor('ProjectionCard')

  const [showSubtasks, setShowSubtasks] = useState(false)
  const [showAddSubtask, setShowAddSubtask] = useState(false)
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    estimated_hours: '',
    priority: 'medium',
    deadline: ''
  })

  const queryClient = useQueryClient()
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers()

  // Optimized query options for subtasks
  const subtaskQueryOptions = useAdaptiveQueryOptions('normal', showSubtasks)

  // Fetch subtasks with adaptive polling
  const { data: subtasks = [], isLoading: subtasksLoading } = useQuery<Subtask[]>({
    queryKey: ['projection-subtasks', projection.id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projections/${projection.id}/subtasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.data || []
    },
    enabled: showSubtasks,
    refetchInterval: subtaskQueryOptions.refetchInterval,
    refetchIntervalInBackground: subtaskQueryOptions.refetchIntervalInBackground,
    refetchOnWindowFocus: subtaskQueryOptions.refetchOnWindowFocus,
    refetchOnMount: subtaskQueryOptions.refetchOnMount,
    staleTime: subtaskQueryOptions.staleTime,
  })

  // Memoized calculations for performance
  const cardMetrics = useMemo(() => {
    const totalSubtasks = subtasks.length
    const completedSubtasks = subtasks.filter((st: Subtask) => st.status === 'completed').length
    const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0
    const totalEstimated = subtasks.reduce((sum: number, st: Subtask) => sum + st.estimated_hours, 0)
    const totalActual = subtasks.reduce((sum: number, st: Subtask) => sum + st.actual_hours, 0)
    
    return {
      totalSubtasks,
      completedSubtasks,
      progressPercentage,
      totalEstimated,
      totalActual,
      variance: totalActual - totalEstimated
    }
  }, [subtasks])

  const statusColor = useMemo(() => {
    switch (projection.status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'planned': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [projection.status])

  const priorityColor = useMemo(() => {
    // Since priority is not in WorkProjection interface, derive it from other fields
    const priority = (projection as any).priority || 'medium'
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [projection])

  // Memoized callbacks to prevent child re-renders
  const handleToggleSubtasks = useCallback(() => {
    setShowSubtasks(prev => !prev)
  }, [])

  const handleEditProjection = useCallback(() => {
    onEdit(projection)
  }, [onEdit, projection])

  const handleDeleteProjection = useCallback(() => {
    onDelete(projection)
  }, [onDelete, projection])

  // Create subtask mutation
  const createSubtaskMutation = useMutation({
    mutationFn: async (subtaskData: any) => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projections/${projection.id}/subtasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subtaskData)
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-subtasks', projection.id] })
      setShowAddSubtask(false)
      setNewSubtask({
        title: '',
        description: '',
        assigned_to: '',
        estimated_hours: '',
        priority: 'medium',
        deadline: ''
      })
    }
  })

  // Update subtask mutation
  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projections/subtasks/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-subtasks', projection.id] })
    }
  })

  // Delete subtask mutation
  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projections/subtasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-subtasks', projection.id] })
    }
  })

  const handleCreateSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    createSubtaskMutation.mutate({
      ...newSubtask,
      estimated_hours: parseFloat(newSubtask.estimated_hours)
    })
  }

  const totalEstimated = subtasks.reduce((sum: number, st: Subtask) => sum + (st.estimated_hours || 0), 0)
  const totalActual = subtasks.reduce((sum: number, st: Subtask) => sum + (st.actual_hours || 0), 0)
  const completedCount = subtasks.filter((st: Subtask) => st.status === 'completed').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {projection.title || projection.project?.name || 'Untitled Projection'}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {format(new Date(projection.week_start_date), 'MMM d')} - {format(new Date(projection.week_end_date), 'MMM d, yyyy')}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${
                projection.projection_type === 'monthly' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200'
              }`}>
                {projection.projection_type === 'monthly' ? '📅 MONTHLY' : '📊 WEEKLY'}
              </span>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(projection.status)}`}>
            {projection.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {/* Description */}
        {projection.notes && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700">{projection.notes}</p>
          </div>
        )}

        {/* Subtasks Summary */}
        {subtasks.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Total Subtasks</p>
              <p className="text-2xl font-bold text-gray-900">{subtasks.length}</p>
            </div>
            <div className="text-center border-l border-r border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{totalEstimated}h</p>
            </div>
          </div>
        )}

        {/* Subtasks Toggle */}
        <button
          onClick={() => setShowSubtasks(!showSubtasks)}
          className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mb-2"
        >
          <span className="flex items-center text-sm font-medium text-gray-700">
            <Users className="w-4 h-4 mr-2" />
            Work Breakdown & Team Assignment ({subtasks.length})
          </span>
          {showSubtasks ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {/* Subtasks List */}
        {showSubtasks && (
          <div className="mt-4 space-y-3">
            {subtasksLoading ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading subtasks...</p>
            ) : subtasks.length > 0 ? (
              subtasks.map((subtask: Subtask) => (
                <div key={subtask.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{subtask.title}</h4>
                      {subtask.description && (
                        <p className="text-sm text-gray-600 mt-1">{subtask.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete subtask"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Assigned To</p>
                      <p className="font-medium text-gray-900">{subtask.assigned_user?.full_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Estimated Hours</p>
                      <p className="font-medium text-gray-900">{subtask.estimated_hours || 0}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Priority</p>
                      <p className={`font-medium ${getPriorityColor(subtask.priority)}`}>
                        {subtask.priority.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <select
                        value={subtask.status}
                        onChange={(e) => updateSubtaskMutation.mutate({ 
                          id: subtask.id, 
                          data: { status: e.target.value } 
                        })}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No subtasks yet. Add your first subtask below.</p>
            )}

            {/* Add Subtask Form */}
            {showAddSubtask ? (
              <form onSubmit={handleCreateSubtask} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-gray-900 mb-3">Add New Subtask</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Task Title *</label>
                    <input
                      type="text"
                      required
                      className="input text-sm"
                      value={newSubtask.title}
                      onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                      placeholder="e.g., Create homepage design mockup"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      className="input text-sm"
                      rows={2}
                      value={newSubtask.description}
                      onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                      placeholder="Brief description of the task..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Assign To *</label>
                      <select
                        required
                        className="input text-sm"
                        value={newSubtask.assigned_to}
                        onChange={(e) => setNewSubtask({ ...newSubtask, assigned_to: e.target.value })}
                        disabled={usersLoading}
                      >
                        <option value="">
                          {usersLoading ? 'Loading team members...' : usersError ? 'Error loading users' : 'Select Team Member'}
                        </option>
                        {users.map((user: any) => (
                          <option key={user.id} value={user.id}>{user.full_name}</option>
                        ))}
                      </select>
                      {usersError && (
                        <p className="text-xs text-red-600 mt-1">Failed to load team members. Please refresh.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Hours *</label>
                      <input
                        type="number"
                        required
                        step="0.5"
                        min="0.5"
                        className="input text-sm"
                        value={newSubtask.estimated_hours}
                        onChange={(e) => setNewSubtask({ ...newSubtask, estimated_hours: e.target.value })}
                        placeholder="e.g., 8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        className="input text-sm"
                        value={newSubtask.priority}
                        onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Deadline</label>
                      <input
                        type="date"
                        className="input text-sm"
                        value={newSubtask.deadline}
                        onChange={(e) => setNewSubtask({ ...newSubtask, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button type="submit" className="btn btn-primary text-sm py-2">
                    Add Subtask
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSubtask(false)}
                    className="btn btn-secondary text-sm py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddSubtask(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Subtask & Assign Team Member</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
        <button
          onClick={handleEditProjection}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Edit2 className="w-4 h-4 mr-1" />
          Edit Projection
        </button>
        <button
          onClick={handleDeleteProjection}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  )
})

ProjectionCard.displayName = 'ProjectionCard'

export default ProjectionCard
