import React from 'react'

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

interface ReportTableProps {
  dailyData: DailyActivity[]
  viewMode: 'daily' | 'weekly' | 'monthly'
  isLoading?: boolean
}

const formatDate = (dateString: string, mode: 'daily' | 'weekly' | 'monthly') => {
  const date = new Date(dateString)
  
  if (mode === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } else if (mode === 'weekly') {
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

export function ReportTable({ dailyData, viewMode, isLoading = false }: ReportTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/6"></div>
                <div className="h-4 bg-gray-300 rounded w-1/6"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (dailyData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Data Found</h3>
        <p className="text-gray-600 mb-4">
          No task activity matches your current filters. Try adjusting the date range or employee selection.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Daily Activity Details</h3>
        <p className="text-sm text-gray-600 mt-1">
          Showing {dailyData.length} {viewMode} records with task breakdowns
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" role="table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent Tasks
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dailyData.map((activity, index) => (
              <tr key={`${activity.date}-${activity.employee}-${index}`} className="hover:bg-gray-50">
                {/* Date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatDate(activity.date, viewMode)}
                </td>

                {/* Employee */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {activity.employee.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {activity.employee}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Completed Tasks */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {activity.tasksCompleted} tasks
                    </span>
                  </div>
                </td>

                {/* Updated Tasks */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {activity.tasksUpdated} tasks
                    </span>
                  </div>
                </td>

                {/* Recent Tasks */}
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    {activity.tasks.length > 0 ? (
                      <div className="space-y-1">
                        {activity.tasks.slice(0, 3).map((task, taskIndex) => (
                          <div key={taskIndex} className="flex items-center justify-between text-xs">
                            <span className="truncate mr-2 text-gray-700" title={task.title}>
                              {task.title}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {formatStatus(task.status)}
                            </span>
                          </div>
                        ))}
                        {activity.tasks.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{activity.tasks.length - 3} more tasks
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No tasks</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Total: {dailyData.reduce((sum, day) => sum + day.tasksCompleted + day.tasksUpdated, 0)} task activities
          </span>
          <div className="flex items-center space-x-4">
            <span>
              {dailyData.reduce((sum, day) => sum + day.tasksCompleted, 0)} completed
            </span>
            <span>
              {dailyData.reduce((sum, day) => sum + day.tasksUpdated, 0)} updated
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}