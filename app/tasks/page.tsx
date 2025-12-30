'use client'

import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/lib/auth/AuthProvider'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useProjects, useUsers } from '@/lib/hooks'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CreateTaskRequest, UpdateTaskRequest, Task } from '@/types'

function TasksContent() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [filterAssignee, setFilterAssignee] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  
  const [newTask, setNewTask] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    project_id: null,
    assigned_to: '',
    deadline: null
  })

  const { data: tasks = [], isLoading, error, refetch } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: users = [] } = useUsers()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  // Get unique departments from users
  const departments = useMemo(() => {
    const depts = new Set(users.map(u => u.department).filter(Boolean))
    return Array.from(depts).sort()
  }, [users])

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by department
      if (filterDepartment) {
        const assignedUser = users.find(u => u.id === task.assigned_to)
        if (!assignedUser || assignedUser.department !== filterDepartment) {
          return false
        }
      }
      
      // Filter by assignee
      if (filterAssignee && task.assigned_to !== filterAssignee) {
        return false
      }
      
      // Filter by status
      if (filterStatus && task.status !== filterStatus) {
        return false
      }
      
      return true
    })
  }, [tasks, users, filterDepartment, filterAssignee, filterStatus])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTask.mutateAsync(newTask)
    setShowCreateModal(false)
    setNewTask({ 
      title: '', 
      description: '', 
      status: 'pending',
      priority: 'medium',
      project_id: null,
      assigned_to: '',
      deadline: null
    })
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return
    
    const updateData: UpdateTaskRequest = {
      title: editingTask.title,
      description: editingTask.description,
      status: editingTask.status,
      priority: editingTask.priority,
      project_id: editingTask.project_id,
      assigned_to: editingTask.assigned_to,
      deadline: editingTask.deadline
    }
    
    await updateTask.mutateAsync({ id: editingTask.id, data: updateData })
    setEditingTask(null)
  }

  const handleDeleteTask = async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id)
    }
  }

  const clearFilters = () => {
    setFilterDepartment('')
    setFilterAssignee('')
    setFilterStatus('')
  }

  if (error) {
    return <ErrorDisplay error={error} retry={refetch} title="Failed to load tasks" />
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage your tasks and assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          disabled={createTask.isPending}
        >
          Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Assignee
            </label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="input"
            >
              <option value="">All Assignees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {(filterDepartment || filterAssignee || filterStatus) && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        )}
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {tasks.length === 0 ? 'No tasks found' : 'No tasks match your filters'}
          </h3>
          <p className="text-gray-500">
            {tasks.length === 0 
              ? 'Create your first task to get started.' 
              : 'Try adjusting your filters to see more tasks.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTasks.map((task) => {
                const assignedUser = users.find(u => u.id === task.assigned_to)
                return (
                  <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEditTask(task)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {task.project_name || projects.find(p => p.id === task.project_id)?.name || 'No Project'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {assignedUser?.full_name || task.assigned_user_name || 'Unknown'}
                      </div>
                      {assignedUser?.department && (
                        <div className="text-xs text-gray-500">{assignedUser.department}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTask(task.id)
                        }}
                        className="text-red-600 hover:text-red-800"
                        disabled={deleteTask.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={newTask.project_id || ''}
                    onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To *
                  </label>
                  <select
                    required
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="input"
                  >
                    <option value="">Select User</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                    className="input"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newTask.deadline || ''}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value || null })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                  disabled={createTask.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Edit Task</h2>
            <form onSubmit={handleUpdateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={editingTask.project_id || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To *
                  </label>
                  <select
                    required
                    value={editingTask.assigned_to}
                    onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                    className="input"
                  >
                    <option value="">Select User</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                    className="input"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={editingTask.deadline ? editingTask.deadline.split('T')[0] : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value || null })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="btn btn-secondary flex-1"
                  disabled={updateTask.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <TasksContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}
