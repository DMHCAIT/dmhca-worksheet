'use client'

import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Clock, Target, Award, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns'

interface AnalyticsDashboardProps {
  projections: any[]
  selectedDate: Date
  viewMode: 'week' | 'month'
}

export default function AnalyticsDashboard({ 
  projections, 
  selectedDate,
  viewMode 
}: AnalyticsDashboardProps) {
  
  const stats = useMemo(() => {
    const totalEstimated = projections.reduce((sum, p) => sum + p.estimated_hours, 0)
    const totalActual = projections.reduce((sum, p) => sum + (p.actual_hours || 0), 0)
    const variance = totalActual - totalEstimated
    const accuracy = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0
    const completed = projections.filter(p => p.status === 'completed').length
    const inProgress = projections.filter(p => p.status === 'in_progress').length
    const planned = projections.filter(p => p.status === 'planned').length
    
    return {
      totalEstimated,
      totalActual,
      variance,
      accuracy,
      completed,
      inProgress,
      planned,
      total: projections.length
    }
  }, [projections])

  // Weekly trend data
  const weeklyTrend = useMemo(() => {
    if (viewMode !== 'month') return []
    
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 })
    
    return weeks.map((weekStart) => {
      const weekProjections = projections.filter(p => {
        const pDate = new Date(p.week_start_date)
        return format(pDate, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd')
      })
      
      return {
        week: format(weekStart, 'MMM d'),
        estimated: weekProjections.reduce((sum, p) => sum + p.estimated_hours, 0),
        actual: weekProjections.reduce((sum, p) => sum + (p.actual_hours || 0), 0)
      }
    })
  }, [projections, selectedDate, viewMode])

  // Project distribution
  const projectDistribution = useMemo(() => {
    const projectMap = new Map()
    
    projections.forEach(p => {
      const name = p.project?.name || 'Unknown'
      const current = projectMap.get(name) || { name, hours: 0, count: 0 }
      projectMap.set(name, {
        name,
        hours: current.hours + (p.actual_hours || p.estimated_hours),
        count: current.count + 1
      })
    })
    
    return Array.from(projectMap.values()).sort((a, b) => b.hours - a.hours).slice(0, 5)
  }, [projections])

  // Status distribution
  const statusData = useMemo(() => [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'In Progress', value: stats.inProgress, color: '#3b82f6' },
    { name: 'Planned', value: stats.planned, color: '#eab308' },
  ].filter(d => d.value > 0), [stats])

  if (projections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Add projections to see analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Accuracy</h4>
            {stats.accuracy > 90 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.accuracy.toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-1">Estimation accuracy</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Completion</h4>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.completed} of {stats.total} completed
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Variance</h4>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <p className={`text-3xl font-bold ${stats.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.variance > 0 ? '+' : ''}{stats.variance}h
          </p>
          <p className="text-xs text-gray-500 mt-1">Actual vs Estimated</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Capacity</h4>
            <Target className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEstimated}h</p>
          <p className="text-xs text-gray-500 mt-1">Total estimated hours</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend (Only for month view) */}
        {viewMode === 'month' && weeklyTrend.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="estimated" stroke="#3b82f6" strokeWidth={2} name="Estimated Hours" />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} name="Actual Hours" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Projects */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Projects by Hours</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#3b82f6" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Count */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projections by Project</h3>
          <div className="space-y-3">
            {projectDistribution.map((project, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    <span className="text-sm text-gray-600">{project.hours}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(project.hours / projectDistribution[0].hours) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
