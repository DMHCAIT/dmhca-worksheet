import React, { useState } from 'react'
import { UserRole } from '@/types/enhanced'

interface UserFiltersBarProps {
  onFilterChange: (filters: UserFilters) => void
  totalUsers: number
  filteredCount: number
  departments: string[]
}

export interface UserFilters {
  search: string
  role: UserRole | 'all'
  department: string
  status: 'all' | 'active' | 'inactive'
}

const roleOptions = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Administrators' },
  { value: 'team_lead', label: 'Team Leads' },
  { value: 'employee', label: 'Employees' },
] as const

const statusOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
] as const

export function UserFiltersBar({
  onFilterChange,
  totalUsers,
  filteredCount,
  departments
}: UserFiltersBarProps) {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    department: '',
    status: 'all'
  })

  const handleFilterUpdate = (newFilters: Partial<UserFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const clearFilters = () => {
    const defaultFilters: UserFilters = {
      search: '',
      role: 'all',
      department: '',
      status: 'all'
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters = filters.search !== '' || 
    filters.role !== 'all' || 
    filters.department !== '' || 
    filters.status !== 'all'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6" role="region" aria-label="User filters">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
        {/* Search */}
        <div className="flex-1 min-w-0">
          <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Users
          </label>
          <div className="relative">
            <input
              type="text"
              id="user-search"
              value={filters.search}
              onChange={(e) => handleFilterUpdate({ search: e.target.value })}
              placeholder="Search by name, email, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-describedby="search-help"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className="h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <p id="search-help" className="mt-1 text-xs text-gray-600">
            Search across names, email addresses, and departments
          </p>
        </div>

        {/* Role Filter */}
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="role-filter"
            value={filters.role}
            onChange={(e) => handleFilterUpdate({ role: e.target.value as UserRole | 'all' })}
            className="w-full lg:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {roleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            id="department-filter"
            value={filters.department}
            onChange={(e) => handleFilterUpdate({ department: e.target.value })}
            className="w-full lg:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => handleFilterUpdate({ status: e.target.value as 'all' | 'active' | 'inactive' })}
            className="w-full lg:w-36 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div>
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              Showing {filteredCount.toLocaleString()} of {totalUsers.toLocaleString()} users
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Filtered
              </span>
            )}
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.role !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                  Role: {roleOptions.find(r => r.value === filters.role)?.label}
                </span>
              )}
              {filters.department && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                  Dept: {filters.department}
                </span>
              )}
              {filters.status !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                  Status: {statusOptions.find(s => s.value === filters.status)?.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}