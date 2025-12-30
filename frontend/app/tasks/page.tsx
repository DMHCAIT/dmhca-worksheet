'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { tasksApi, projectsApi, usersApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'
import toast from 'react-hot-toast'

interface Task {
  id: number
  title: string
  description: string
  status: string
  priority: string
  project_id: number
  assigned_to: string
  team: string
  deadline: string
  created_by: string
  created_at: string
  project?: { name: string }
  assignee?: { full_name: string, email: string }
}

interface Project {
  id: number
  name: string
  team: string
}

interface User {
  id: string
  full_name: string
  email: string
  team: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    project_id: '',
    assigned_to: '',
    priority: 'medium',
    deadline: '',
    team: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchTasks()
    fetchProjects()
    fetchUsers()
  }, [])

  const fetchTasks = async () => {
    try {
      const data = await tasksApi.getAll()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to fetch tasks')
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

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await tasksApi.create(newTask)
      toast.success('Task created successfully!')
      setShowCreateModal(false)
      setNewTask({
        title: '',
        description: '',
        project_id: '',
        assigned_to: '',
        priority: 'medium',
        deadline: '',
        team: ''
      })
      fetchTasks()
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await tasksApi.update(taskId.toString(), { status: newStatus })
      toast.success('Task status updated!')
      fetchTasks()
    } catch (error) {
      toast.error('Failed to update task status')
    }
  }

  const canCreateTask = user && ['admin', 'team_lead'].includes(user.role)

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    if (filter === 'my') return task.assigned_to === user?.id
    return task.status === filter
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading tasks...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage and track your tasks</p>
        </div>
        {canCreateTask && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Tasks
        </button>
        <button
          onClick={() => setFilter('my')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'my' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          My Tasks
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'in_progress' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'completed' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500">No tasks match your current filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{task.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                    <p><span className="font-medium">Project:</span> {task.project?.name || 'No project'}</p>
                    <p><span className="font-medium">Assigned to:</span> {task.assignee?.full_name || 'Unassigned'}</p>
                    <p><span className="font-medium">Team:</span> {task.team}</p>
                    {task.deadline && (
                      <p><span className="font-medium">Deadline:</span> {new Date(task.deadline).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1"
                    disabled={!canCreateTask && task.assigned_to !== user?.id}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateTask}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Task Title</label>
                      <input
                        type="text"
                        required
                        className="input mt-1"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        className="input mt-1"
                        rows={3}
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Project</label>
                        <select
                          className="input mt-1"
                          value={newTask.project_id}
                          onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                        >
                          <option value="">Select Project</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Priority</label>
                        <select
                          className="input mt-1"
                          value={newTask.priority}
                          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Assign to</label>
                        <select
                          required
                          className="input mt-1"
                          value={newTask.assigned_to}
                          onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                        >
                          <option value="">Select User</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Team</label>
                        <select
                          required
                          className="input mt-1"
                          value={newTask.team}
                          onChange={(e) => setNewTask({ ...newTask, team: e.target.value })}
                        >
                          <option value="">Select Team</option>
                          <option value="admin">Admin Team</option>
                          <option value="digital_marketing">Digital Marketing</option>
                          <option value="sales">Sales Team</option>
                          <option value="it">IT Team</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Deadline</label>
                      <input
                        type="date"
                        className="input mt-1"
                        value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary sm:ml-3">
                    Create Task
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