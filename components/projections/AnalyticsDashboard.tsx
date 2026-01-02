'use client'

import React, { useMemo, memo, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Clock, Target, Award, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns'
import { usePerformanceMonitor } from '@/lib/hooks/usePerformanceOptimization'

interface AnalyticsDashboardProps {
  projections: any[]
  selectedDate: Date
  viewMode: 'week' | 'month'
}

// Memoized stats card component
const StatsCard = memo(({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  trend,
  trendColor 
}: {
  icon: any
  title: string
  value: string | number
  subtitle: string
  trend?: number
  trendColor?: string
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {trend !== undefined && (
                <div className={`ml-2 flex items-baseline text-sm ${trendColor}`}>
                  {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="ml-1">{Math.abs(trend)}%</span>
                </div>
              )}
            </dd>
            <dd className="text-sm text-gray-500">{subtitle}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
))

StatsCard.displayName = 'StatsCard'

// Memoized chart component
const MemoizedChart = memo(({ 
  type, 
  data, 
  title, 
  height = 300 
}: { 
  type: 'bar' | 'line' | 'pie'
  data: any[]
  title: string
  height?: number
}) => {
  const renderChart = useCallback(() => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="estimated" fill="#3B82F6" name="Estimated Hours" />
            <Bar dataKey="actual" fill="#10B981" name="Actual Hours" />
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="projected" stroke="#3B82F6" strokeWidth={2} name="Projected Hours" />
            <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} name="Actual Hours" />
          </LineChart>
        )
      case 'pie':
        const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )
      default:
        return null
    }
  }, [type, data])

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
})

MemoizedChart.displayName = 'MemoizedChart'

const AnalyticsDashboard = memo(({ 
  projections, 
  selectedDate,
  viewMode 
}: AnalyticsDashboardProps) => {
  // Performance monitoring for debugging
  usePerformanceMonitor('AnalyticsDashboard')
  
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

  // Charts data with optimized memoization
  const chartsData = useMemo(() => ({
    weeklyTrend: viewMode === 'month' ? weeklyTrend : [],
    statusData,
    projectDistribution,
    maxProjectHours: projectDistribution.length > 0 ? projectDistribution[0].hours : 0
  }), [viewMode, weeklyTrend, statusData, projectDistribution])

  // Memoized stats cards data
  const statsCardsData = useMemo(() => [
    {
      icon: Target,
      title: 'Accuracy',
      value: `${stats.accuracy.toFixed(0)}%`,
      subtitle: 'Estimation accuracy',
      trend: stats.accuracy > 90 ? 5 : -5,
      trendColor: stats.accuracy > 90 ? 'text-green-600' : 'text-red-600'
    },
    {
      icon: Award,
      title: 'Completion',
      value: `${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%`,
      subtitle: `${stats.completed} of ${stats.total} completed`
    },
    {
      icon: Clock,
      title: 'Variance',
      value: `${stats.variance > 0 ? '+' : ''}${stats.variance}h`,
      subtitle: 'Actual vs Estimated'
    },
    {
      icon: Target,
      title: 'Capacity',
      value: `${stats.totalEstimated}h`,
      subtitle: 'Total estimated hours'
    }
  ], [stats])

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
        {statsCardsData.map((card, index) => (
          <StatsCard key={index} {...card} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend (Only for month view) */}
        {chartsData.weeklyTrend.length > 0 && (
          <MemoizedChart
            type="line"
            data={chartsData.weeklyTrend}
            title="Weekly Trend"
            height={250}
          />
        )}

        {/* Status Distribution */}
        <MemoizedChart
          type="pie"
          data={chartsData.statusData}
          title="Status Distribution"
          height={250}
        />

        {/* Top Projects */}
        <MemoizedChart
          type="bar"
          data={chartsData.projectDistribution}
          title="Top Projects by Hours"
          height={250}
        />

        {/* Project Count */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projections by Project</h3>
          <div className="space-y-3">
            {chartsData.projectDistribution.map((project, index) => (
              <div key={project.name} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    <span className="text-sm text-gray-600">{project.hours}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${chartsData.maxProjectHours > 0 ? (project.hours / chartsData.maxProjectHours) * 100 : 0}%` }}
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
})

AnalyticsDashboard.displayName = 'AnalyticsDashboard'

export default AnalyticsDashboard
