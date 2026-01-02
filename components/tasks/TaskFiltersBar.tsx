import React from 'react'
import { Task, TaskPriority, TaskStatus } from '@/types/enhanced'
import { TaskFilters } from '@/types/enhanced'

interface TaskFiltersBarProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  departments: string[]
  users: Array<{ id: string; full_name: string }>
  projects: Array<{ id: number; name: string }>
  onClearFilters: () => void
}

const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
]

const statusOptions: Array<{ value: TaskStatus; label: string; color: string }> = [
  { value: 'pending', label: 'Pending', color: 'text-gray-600' },
  { value: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
  { value: 'completed', label: 'Completed', color: 'text-green-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-600' },
]

export function TaskFiltersBar({
  filters,
  onFiltersChange,
  departments,
  users,
  projects,
  onClearFilters
}: TaskFiltersBarProps) {
  const handleFilterChange = (key: keyof TaskFilters, value: string | number | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    })
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'page' && key !== 'limit' && value !== undefined && value !== ''
  )

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <div className="relative">
            <input
              type="text"
              id="task-search"
              placeholder="Search tasks..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search tasks by title or description"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Status Filter */}
        <div className="min-w-40">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value as TaskStatus)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All statuses</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="min-w-40">
          <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority-filter"
            value={filters.priority || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value as TaskPriority)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All priorities</option>
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div className="min-w-40">
          <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            id="department-filter"
            value={filters.department || ''}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div className="min-w-48">
          <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Assigned to
          </label>
          <select
            id="assignee-filter"
            value={filters.assigned_to || ''}
            onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Filter */}
        <div className="min-w-48">
          <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            id="project-filter"
            value={filters.project_id || ''}
            onChange={(e) => handleFilterChange('project_id', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div>
          <label htmlFor="date-from-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Date from
          </label>
          <input
            type="date"
            id="date-from-filter"
            value={filters.date_from || ''}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="date-to-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Date to
          </label>
          <input
            type="date"
            id="date-to-filter"
            value={filters.date_to || ''}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{filters.search}"
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Status: {statusOptions.find(s => s.value === filters.status)?.label}
            </span>
          )}
          {filters.priority && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Priority: {priorityOptions.find(p => p.value === filters.priority)?.label}
            </span>
          )}
          {filters.department && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Department: {filters.department}
            </span>
          )}
          {filters.assigned_to && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Assignee: {users.find(u => u.id === filters.assigned_to)?.full_name}
            </span>
          )}
          {filters.project_id && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
              Project: {projects.find(p => p.id === filters.project_id)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}