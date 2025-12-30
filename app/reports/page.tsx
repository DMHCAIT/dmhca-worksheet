'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { reportsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface DashboardStats {
  totalProjects: number
  totalTasks: number
  totalUsers: number
  projectsByTeam: { team: string; count: number }[]
  tasksByStatus: { status: string; count: number }[]
  tasksByPriority: { priority: string; count: number }[]
  recentActivity: any[]
}

interface ProjectStats {
  id: number
  name: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  pendingTasks: number
  team: string
  progress: number
}

interface TeamPerformance {
  team: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  averageCompletionTime: number
  performance: number
}

export default function ReportsPage() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([])
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('dashboard')
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardStats()
    fetchProjectStats()
    fetchTeamPerformance()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const data = await reportsApi.getDashboard()
      setDashboardStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjectStats = async () => {
    try {
      const data = await reportsApi.getProjectStats()
      setProjectStats(data)
    } catch (error) {
      console.error('Error fetching project stats:', error)
    }
  }

  const fetchTeamPerformance = async () => {
    try {
      const data = await reportsApi.getTeamPerformance()
      setTeamPerformance(data)
    } catch (error) {
      console.error('Error fetching team performance:', error)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading reports...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Comprehensive insights into your team's performance</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setSelectedTab('dashboard')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedTab === 'dashboard' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedTab('projects')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedTab === 'projects' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Project Analytics
        </button>
        <button
          onClick={() => setSelectedTab('team')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedTab === 'team' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Team Performance
        </button>
      </div>

      {/* Dashboard Overview */}
      {selectedTab === 'dashboard' && dashboardStats && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Projects</h3>
              <p className="text-3xl font-bold text-primary-600">{dashboardStats.totalProjects}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Tasks</h3>
              <p className="text-3xl font-bold text-blue-600">{dashboardStats.totalTasks}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Team Members</h3>
              <p className="text-3xl font-bold text-green-600">{dashboardStats.totalUsers}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Projects by Team */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects by Team</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardStats.projectsByTeam}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="team" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tasks by Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardStats.tasksByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {dashboardStats.tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks by Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardStats.tasksByPriority} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="priority" type="category" />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Project Analytics */}
      {selectedTab === 'projects' && (
        <div className="space-y-8">
          <div className="grid gap-6">
            {projectStats.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-gray-600">Team: {project.team}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">{project.progress}%</p>
                    <p className="text-gray-500">Complete</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                {/* Task Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{project.totalTasks}</p>
                    <p className="text-gray-600">Total Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{project.completedTasks}</p>
                    <p className="text-gray-600">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{project.inProgressTasks}</p>
                    <p className="text-gray-600">In Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{project.pendingTasks}</p>
                    <p className="text-gray-600">Pending</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Performance */}
      {selectedTab === 'team' && (
        <div className="space-y-8">
          <div className="grid gap-6">
            {teamPerformance.map((team) => (
              <div key={team.team} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {team.team.replace('_', ' ')} Team
                    </h3>
                    <p className="text-gray-600">Performance Score: {team.performance}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">
                      {team.averageCompletionTime} days
                    </p>
                    <p className="text-gray-500">Avg. Completion Time</p>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      team.performance >= 80 ? 'bg-green-500' :
                      team.performance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${team.performance}%` }}
                  />
                </div>

                {/* Task Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{team.totalTasks}</p>
                    <p className="text-gray-600">Total Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{team.completedTasks}</p>
                    <p className="text-gray-600">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{team.inProgressTasks}</p>
                    <p className="text-gray-600">In Progress</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}