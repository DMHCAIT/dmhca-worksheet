import React from 'react'

export interface ReportFilters {
  employee: string
  viewMode: 'daily' | 'weekly' | 'monthly'
  dateFrom: string
  dateTo: string
}

interface ReportFiltersBarProps {
  filters: ReportFilters
  onFilterChange: (filters: ReportFilters) => void
  employees: Array<{ id: string; name: string }>
  userRole: 'admin' | 'team_lead' | 'employee'
  currentUserName?: string
}

const viewModeOptions = [
  { value: 'daily', label: 'Daily View', description: 'View daily activity breakdown' },
  { value: 'weekly', label: 'Weekly View', description: 'View weekly summaries' },
  { value: 'monthly', label: 'Monthly View', description: 'View monthly reports' },
] as const

export function ReportFiltersBar({
  filters,
  onFilterChange,
  employees,
  userRole,
  currentUserName
}: ReportFiltersBarProps) {
  const handleFilterUpdate = (newFilters: Partial<ReportFilters>) => {
    onFilterChange({ ...filters, ...newFilters })
  }

  const clearFilters = () => {
    const defaultFilters: ReportFilters = {
      employee: userRole === 'admin' ? 'all' : currentUserName || 'all',
      viewMode: 'daily',
      dateFrom: '',
      dateTo: ''
    }
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters = filters.dateFrom !== '' || 
    filters.dateTo !== '' || 
    (userRole === 'admin' && filters.employee !== 'all')

  const canViewAllEmployees = userRole === 'admin' || userRole === 'team_lead'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6" role="region" aria-label="Report filters">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
        {/* Employee Filter */}
        {canViewAllEmployees && (
          <div>
            <label htmlFor="employee-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              id="employee-filter"
              value={filters.employee}
              onChange={(e) => handleFilterUpdate({ employee: e.target.value })}
              className="w-full lg:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Employees</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.name}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* View Mode Filter */}
        <div>
          <label htmlFor="view-mode-filter" className="block text-sm font-medium text-gray-700 mb-1">
            View Mode
          </label>
          <select
            id="view-mode-filter"
            value={filters.viewMode}
            onChange={(e) => handleFilterUpdate({ viewMode: e.target.value as 'daily' | 'weekly' | 'monthly' })}
            className="w-full lg:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {viewModeOptions.map(option => (
              <option key={option.value} value={option.value} title={option.description}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From Filter */}
        <div>
          <label htmlFor="date-from-filter" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            id="date-from-filter"
            value={filters.dateFrom}
            onChange={(e) => handleFilterUpdate({ dateFrom: e.target.value })}
            className="w-full lg:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            max={filters.dateTo || new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Date To Filter */}
        <div>
          <label htmlFor="date-to-filter" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            id="date-to-filter"
            value={filters.dateTo}
            onChange={(e) => handleFilterUpdate({ dateTo: e.target.value })}
            className="w-full lg:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={filters.dateFrom}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              aria-label="Clear all filters"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Filter Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              Viewing {filters.viewMode} report
            </span>
            {canViewAllEmployees && (
              <span>
                for {filters.employee === 'all' ? 'all employees' : filters.employee}
              </span>
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <span>
                {filters.dateFrom && filters.dateTo ? (
                  `from ${filters.dateFrom} to ${filters.dateTo}`
                ) : filters.dateFrom ? (
                  `from ${filters.dateFrom}`
                ) : (
                  `until ${filters.dateTo}`
                )}
              </span>
            )}
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.dateFrom && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                  From: {new Date(filters.dateFrom).toLocaleDateString()}
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                  To: {new Date(filters.dateTo).toLocaleDateString()}
                </span>
              )}
              {canViewAllEmployees && filters.employee !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                  Employee: {filters.employee}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}