'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { reportsApi, tasksApi, projectsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
  highPriorityTasks: number
  completionRate: number
}

interface RecentTask {
  id: string
  title: string
  status: string
  priority: string
  due_date: string
  assignee: {
    full_name: string
  }
}

interface ProjectProgress {
  id: string
  name: string
  progress: number
  total_tasks: number
  completed_tasks: number
}

interface Activity {
  id: string
  type: string
  description: string
  timestamp: string
  user: {
    full_name: string
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsData = await reportsApi.getDashboard()
      setStats(statsData)

      // Fetch recent tasks
      const tasksData = await tasksApi.getTasks({ limit: 5, sort: 'created_at', order: 'desc' })
      setRecentTasks(tasksData.tasks || [])

      // Fetch project progress
      const projectsData = await projectsApi.getProjects()
      setProjectProgress(projectsData.projects || [])

      // Generate mock activities (since we don't have an activities API)
      const mockActivities = [
        {
          id: '1',
          type: 'task_completed',
          description: 'Task "UI Design" was completed',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user: { full_name: 'John Doe' }
        },
        {
          id: '2',
          type: 'project_created',
          description: 'New project "Mobile App" was created',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          user: { full_name: 'Jane Smith' }
        },
        {
          id: '3',
          type: 'task_assigned',
          description: 'Task "API Development" was assigned to team',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          user: { full_name: 'Bob Wilson' }
        }
      ]
      setActivities(mockActivities)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-yellow-600 bg-yellow-100'
      case 'pending': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const taskStatusData = stats ? [
    { name: 'Completed', value: stats.completedTasks, color: '#00C49F' },
    { name: 'In Progress', value: stats.inProgressTasks, color: '#FFBB28' },
    { name: 'Pending', value: stats.pendingTasks, color: '#FF8042' }
  ] : []

  const weeklyProgressData = [
    { name: 'Mon', tasks: 12, completed: 8 },
    { name: 'Tue', tasks: 15, completed: 12 },
    { name: 'Wed', tasks: 18, completed: 14 },
    { name: 'Thu', tasks: 22, completed: 18 },
    { name: 'Fri', tasks: 16, completed: 15 },
    { name: 'Sat', tasks: 8, completed: 7 },
    { name: 'Sun', tasks: 5, completed: 5 }
  ]

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {user && (
          <p className="text-sm text-gray-600 mt-1">
            Welcome back, {user.full_name} ({user.role})
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Today is {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalTasks}</p>
              </div>
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completedTasks}</p>
              </div>
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.inProgressTasks}</p>
              </div>
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">High Priority</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.highPriorityTasks}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Task Status Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {taskStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Progress Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" fill="#8884d8" name="Total Tasks" />
              <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Recent Tasks */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
          <div className="space-y-4">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Assigned to: {task.assignee?.full_name || 'Unassigned'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {task.due_date ? formatDate(task.due_date) : 'No due date'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent tasks</p>
            )}
          </div>
        </div>

        {/* Project Progress */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Progress</h3>
          <div className="space-y-4">
            {projectProgress.length > 0 ? (
              projectProgress.slice(0, 4).map((project) => (
                <div key={project.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
                    <span className="text-xs text-gray-600">
                      {project.completed_tasks || 0}/{project.total_tasks || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{(project.progress || 0).toFixed(1)}% complete</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No projects available</p>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    by {activity.user.full_name} • {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completion Rate */}
      {stats && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Completion Rate</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">{stats.completionRate.toFixed(1)}% tasks completed</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="btn btn-primary flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create Task</span>
          </button>
          <button className="btn btn-secondary flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>View Projects</span>
          </button>
          <button className="btn btn-secondary flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
            </svg>
            <span>View Reports</span>
          </button>
          <button className="btn btn-secondary flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Projections</span>
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage