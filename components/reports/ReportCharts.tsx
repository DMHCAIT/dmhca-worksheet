import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts'

interface DailyActivity {
  date: string
  tasksCompleted: number
  tasksUpdated: number
  employee: string
  tasks: {
    title: string
    status: string
    updated_at: string
  }[]
}

interface ReportChartsProps {
  dailyData: DailyActivity[]
  viewMode: 'daily' | 'weekly' | 'monthly'
  isLoading?: boolean
}

const CHART_COLORS = {
  completed: '#10B981', // green-500
  updated: '#3B82F6',   // blue-500
  pending: '#F59E0B',   // amber-500
  cancelled: '#EF4444', // red-500
}

const STATUS_COLORS = [CHART_COLORS.completed, CHART_COLORS.updated, CHART_COLORS.pending, CHART_COLORS.cancelled]

export function ReportCharts({ dailyData, viewMode, isLoading = false }: ReportChartsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Aggregate data based on view mode
  const aggregatedData = React.useMemo(() => {
    const grouped = dailyData.reduce((acc, item) => {
      let key: string
      const date = new Date(item.date)

      if (viewMode === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else if (viewMode === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else {
        key = item.date
      }

      if (!acc[key]) {
        acc[key] = {
          date: key,
          tasksCompleted: 0,
          tasksUpdated: 0,
          tasks: []
        }
      }

      acc[key].tasksCompleted += item.tasksCompleted
      acc[key].tasksUpdated += item.tasksUpdated
      acc[key].tasks.push(...item.tasks)

      return acc
    }, {} as Record<string, { date: string; tasksCompleted: number; tasksUpdated: number; tasks: any[] }>)

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  }, [dailyData, viewMode])

  // Calculate status distribution
  const statusDistribution = React.useMemo(() => {
    const statusCounts = dailyData.reduce((acc, day) => {
      day.tasks.forEach(task => {
        acc[task.status] = (acc[task.status] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: count,
      status
    }))
  }, [dailyData])

  const formatXAxisLabel = (date: string) => {
    const d = new Date(date)
    if (viewMode === 'monthly') {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } else if (viewMode === 'weekly') {
      return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return CHART_COLORS.completed
      case 'in_progress': return CHART_COLORS.updated
      case 'pending': return CHART_COLORS.pending
      default: return CHART_COLORS.cancelled
    }
  }

  return (
    <div className="space-y-6">
      {/* Activity Timeline Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Task Activity Timeline</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>Updated</span>
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={aggregatedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(label) => `Date: ${formatXAxisLabel(label as string)}`}
              formatter={(value, name) => [
                value,
                name === 'tasksCompleted' ? 'Tasks Completed' : 'Tasks Updated'
              ]}
            />
            <Legend />
            <Bar 
              dataKey="tasksCompleted" 
              fill={CHART_COLORS.completed}
              name="Tasks Completed"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="tasksUpdated" 
              fill={CHART_COLORS.updated}
              name="Tasks Updated"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Line Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={aggregatedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(label) => `Date: ${formatXAxisLabel(label as string)}`}
              formatter={(value, name) => [
                value,
                name === 'tasksCompleted' ? 'Tasks Completed' : 'Tasks Updated'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="tasksCompleted" 
              stroke={CHART_COLORS.completed}
              name="Tasks Completed"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="tasksUpdated" 
              stroke={CHART_COLORS.updated}
              name="Tasks Updated"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution Pie Chart */}
      {statusDistribution.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getStatusColor(entry.status)} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Tasks']} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Status Breakdown</h4>
              {statusDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    ></div>
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.value} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}