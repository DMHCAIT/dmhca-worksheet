'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useTasks, useUsers } from '@/lib/hooks'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { ReportFiltersBar, ReportFilters } from '@/components/reports/ReportFiltersBar'
import { ReportCharts } from '@/components/reports/ReportCharts'
import { ReportTable } from '@/components/reports/ReportTable'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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

function ReportsContent() {
  const { user } = useAuth()
  
  // Initialize filters based on user role
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    employee: (user?.role === 'admin' || user?.role === 'manager') ? 'all' : user?.full_name || 'all',
    viewMode: 'daily',
    dateFrom: '',
    dateTo: ''
  }))

  const { data: allTasks = [], isLoading: tasksLoading, error: tasksError } = useTasks()
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers()

  // Update filters when user loads
  useEffect(() => {
    if (user && filters.employee === 'all' && user.role !== 'admin' && user.role !== 'manager') {
      setFilters(prev => ({ ...prev, employee: user.full_name }))
    }
  }, [user, filters.employee])

  // Process tasks into daily activity data
  const dailyData = useMemo<DailyActivity[]>(() => {
    if (!allTasks.length || !users.length) return []

    const filteredTasks = allTasks.filter(task => {
      // Role-based filtering
      if (user?.role === 'employee') {
        return task.assigned_to === user.id
      } else if (user?.role === 'team_lead') {
        return task.team === user.team
      } else if (user?.role === 'manager') {
        // Managers see all tasks like admins
        return true
      }
      // Admin sees all tasks
      return true
    })

    const reports: Record<string, DailyActivity> = {}
    
    filteredTasks.forEach(task => {
      if (!task.updated_at) return
      
      const updatedDate = new Date(task.updated_at)
      const dateKey = updatedDate.toISOString().split('T')[0]
      
      // Apply date filters
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom)
        if (updatedDate < fromDate) return
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (updatedDate > toDate) return
      }
      
      const assignedUser = users.find(u => u.id === task.assigned_to)
      if (!assignedUser) return
      
      const employeeName = assignedUser.full_name
      
      // Apply employee filter
      if (filters.employee !== 'all' && employeeName !== filters.employee) return
      
      const reportKey = `${dateKey}-${employeeName}`
      
      if (!reports[reportKey]) {
        reports[reportKey] = {
          date: dateKey,
          tasksCompleted: 0,
          tasksUpdated: 0,
          employee: employeeName,
          tasks: []
        }
      }
      
      // Count completed vs updated
      if (task.status === 'completed') {
        reports[reportKey].tasksCompleted++
      } else {
        reports[reportKey].tasksUpdated++
      }
      
      reports[reportKey].tasks.push({
        title: task.title,
        status: task.status,
        updated_at: task.updated_at
      })
    })
    
    return Object.values(reports).sort((a, b) => 
      b.date.localeCompare(a.date) || a.employee.localeCompare(b.employee)
    )
  }, [allTasks, users, filters, user])

  // Prepare employee options for filtering
  const employees = useMemo(() => {
    const uniqueEmployees = Array.from(new Set(
      users
        .filter(u => {
          if (user?.role === 'admin' || user?.role === 'manager') return true
          if (user?.role === 'team_lead') return u.team === user.team
          return u.id === user?.id
        })
        .map(u => ({ id: u.id, name: u.full_name }))
    ))
    return uniqueEmployees.sort((a, b) => a.name.localeCompare(b.name))
  }, [users, user])

  const isLoading = tasksLoading || usersLoading
  const error = tasksError || usersError

  if (error) {
    return <ErrorDisplay error={error} title="Failed to load reports data" />
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Activity Reports</h1>
          <p className="text-gray-600 mt-1">Track team performance and task activity</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Filters */}
      <ReportFiltersBar
        filters={filters}
        onFilterChange={setFilters}
        employees={employees}
        userRole={user?.role || 'employee'}
        currentUserName={user?.full_name}
      />

      {/* Charts */}
      <ReportCharts
        dailyData={dailyData}
        viewMode={filters.viewMode}
        isLoading={isLoading}
      />

      {/* Detailed Table */}
      <div className="mt-8">
        <ReportTable
          dailyData={dailyData}
          viewMode={filters.viewMode}
          isLoading={isLoading}
        />
      </div>
    </DashboardLayout>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <ReportsContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}

