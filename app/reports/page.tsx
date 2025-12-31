'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useTasks, useUsers } from '@/lib/hooks'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

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

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}

function ReportsContent() {
  const { user } = useAuth()
  
  // For employees and team leaders, default to their own name; for admin, default to 'all'
  const getInitialEmployee = () => {
    if (!user) return 'all'
    if (user.role === 'employee' || user.role === 'team_lead') {
      return user.full_name
    }
    return 'all'
  }
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>(getInitialEmployee())
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  
  const { data: allTasks = [], isLoading } = useTasks()
  const { data: users = [] } = useUsers()

  // Update selected employee when user loads
  useEffect(() => {
    if (user && (user.role === 'employee' || user.role === 'team_lead')) {
      setSelectedEmployee(user.full_name)
    }
  }, [user])

  // Filter tasks based on user role
  const tasks = useMemo(() => {
    if (!user) return []
    
    // Admin sees all tasks
    if (user.role === 'admin') return allTasks
    
    // Team lead sees only their team's tasks
    if (user.role === 'team_lead') {
      return allTasks.filter(task => task.team === user.team)
    }
    
    // Employee sees only their assigned tasks
    return allTasks.filter(task => task.assigned_to === user.id)
  }, [allTasks, user])

  // Generate daily activity reports
  const dailyReports = useMemo(() => {
    const reports: Record<string, DailyActivity[]> = {}
    
    tasks.forEach(task => {
      const updatedDate = new Date(task.updated_at)
      const dateKey = updatedDate.toISOString().split('T')[0]
      
      // Apply date filter
      if (filterDateFrom || filterDateTo) {
        const taskDate = new Date(dateKey)
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (taskDate < fromDate) return
        }
        
        if (filterDateTo) {
          const toDate = new Date(filterDateTo)
          toDate.setHours(23, 59, 59, 999)
          if (taskDate > toDate) return
        }
      }
      
      // Find the assigned user
      const assignedUser = users.find(u => u.id === task.assigned_to)
      if (!assignedUser) return
      
      const employeeName = assignedUser.full_name
      
      if (!reports[employeeName]) {
        reports[employeeName] = []
      }
      
      let dayReport = reports[employeeName].find(r => r.date === dateKey)
      
      if (!dayReport) {
        dayReport = {
          date: dateKey,
          tasksCompleted: 0,
          tasksUpdated: 0,
          employee: employeeName,
          tasks: []
        }
        reports[employeeName].push(dayReport)
      }
      
      dayReport.tasksUpdated++
      if (task.status === 'completed') {
        dayReport.tasksCompleted++
      }
      
      dayReport.tasks.push({
        title: task.title,
        status: task.status,
        updated_at: task.updated_at
      })
    })
    
    // Sort each employee's reports by date
    Object.keys(reports).forEach(employee => {
      reports[employee].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })
    
    return reports
  }, [tasks, users, filterDateFrom, filterDateTo])

  // Generate weekly summary
  const weeklyReports = useMemo(() => {
    const weekly: Record<string, any[]> = {}
    
    Object.entries(dailyReports).forEach(([employee, days]) => {
      const weeklyData: Record<string, any> = {}
      
      days.forEach(day => {
        const date = new Date(day.date)
        const weekKey = `Week ${getWeekNumber(date)} - ${date.getFullYear()}`
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            week: weekKey,
            tasksCompleted: 0,
            tasksUpdated: 0,
            days: []
          }
        }
        
        weeklyData[weekKey].tasksCompleted += day.tasksCompleted
        weeklyData[weekKey].tasksUpdated += day.tasksUpdated
        weeklyData[weekKey].days.push(day)
      })
      
      weekly[employee] = Object.values(weeklyData)
    })
    
    return weekly
  }, [dailyReports])

  // Generate monthly summary
  const monthlyReports = useMemo(() => {
    const monthly: Record<string, any[]> = {}
    
    Object.entries(dailyReports).forEach(([employee, days]) => {
      const monthlyData: Record<string, any> = {}
      
      days.forEach(day => {
        const date = new Date(day.date)
        const monthKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            tasksCompleted: 0,
            tasksUpdated: 0,
            days: []
          }
        }
        
        monthlyData[monthKey].tasksCompleted += day.tasksCompleted
        monthlyData[monthKey].tasksUpdated += day.tasksUpdated
        monthlyData[monthKey].days.push(day)
      })
      
      monthly[employee] = Object.values(monthlyData)
    })
    
    return monthly
  }, [dailyReports])

  // Helper function to get week number
  function getWeekNumber(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  // Filter data based on selected employee
  const currentEmployee = selectedEmployee === 'all' 
    ? '' 
    : selectedEmployee || (user?.role === 'employee' ? user.full_name : '')
  
  // Get combined data for "All" employees
  const getAllEmployeesData = (dataType: 'daily' | 'weekly' | 'monthly') => {
    if (dataType === 'daily') {
      const allDays: DailyActivity[] = []
      Object.values(dailyReports).forEach(employeeDays => {
        allDays.push(...employeeDays)
      })
      // Group by date
      const grouped: Record<string, DailyActivity> = {}
      allDays.forEach(day => {
        if (!grouped[day.date]) {
          grouped[day.date] = {
            date: day.date,
            tasksCompleted: 0,
            tasksUpdated: 0,
            employee: 'All Employees',
            tasks: []
          }
        }
        grouped[day.date].tasksCompleted += day.tasksCompleted
        grouped[day.date].tasksUpdated += day.tasksUpdated
        grouped[day.date].tasks.push(...day.tasks)
      })
      return Object.values(grouped).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else if (dataType === 'weekly') {
      const allWeeks: any[] = []
      Object.values(weeklyReports).forEach(employeeWeeks => {
        allWeeks.push(...employeeWeeks)
      })
      // Group by week
      const grouped: Record<string, any> = {}
      allWeeks.forEach(week => {
        if (!grouped[week.week]) {
          grouped[week.week] = {
            week: week.week,
            tasksCompleted: 0,
            tasksUpdated: 0,
            days: []
          }
        }
        grouped[week.week].tasksCompleted += week.tasksCompleted
        grouped[week.week].tasksUpdated += week.tasksUpdated
        grouped[week.week].days.push(...week.days)
      })
      return Object.values(grouped)
    } else {
      const allMonths: any[] = []
      Object.values(monthlyReports).forEach(employeeMonths => {
        allMonths.push(...employeeMonths)
      })
      // Group by month
      const grouped: Record<string, any> = {}
      allMonths.forEach(month => {
        if (!grouped[month.month]) {
          grouped[month.month] = {
            month: month.month,
            tasksCompleted: 0,
            tasksUpdated: 0,
            days: []
          }
        }
        grouped[month.month].tasksCompleted += month.tasksCompleted
        grouped[month.month].tasksUpdated += month.tasksUpdated
        grouped[month.month].days.push(...month.days)
      })
      return Object.values(grouped)
    }
  }
  
  const filteredDailyData = selectedEmployee === 'all' 
    ? getAllEmployeesData('daily') as DailyActivity[]
    : dailyReports[currentEmployee] || []
  const filteredWeeklyData = selectedEmployee === 'all'
    ? getAllEmployeesData('weekly')
    : weeklyReports[currentEmployee] || []
  const filteredMonthlyData = selectedEmployee === 'all'
    ? getAllEmployeesData('monthly')
    : monthlyReports[currentEmployee] || []

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Work Activity Reports</h1>
        <p className="text-gray-600">Track daily, weekly, and monthly task updates and completions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="input"
              >
                <option value="all">All Employees</option>
                {Object.keys(dailyReports).map(employee => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Show current user info for employees and team leaders */}
          {(user?.role === 'employee' || user?.role === 'team_lead') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Viewing Reports For
              </label>
              <div className="input bg-gray-100 cursor-not-allowed">
                {user.full_name} (You)
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="input"
            >
              <option value="daily">Daily Reports</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Options
            </label>
            <button className="btn btn-secondary w-full">
              📊 Export to Excel
            </button>
          </div>
        </div>
        
        {(filterDateFrom || filterDateTo) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Active Filters:</span>
            {filterDateFrom && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                From: {new Date(filterDateFrom).toLocaleDateString()}
                <button
                  onClick={() => setFilterDateFrom('')}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {filterDateTo && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                To: {new Date(filterDateTo).toLocaleDateString()}
                <button
                  onClick={() => setFilterDateTo('')}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setFilterDateFrom('')
                setFilterDateTo('')
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Tasks Updated</p>
              <p className="text-3xl font-bold text-blue-900">
                {viewMode === 'daily' ? filteredDailyData.reduce((sum, d) => sum + d.tasksUpdated, 0) :
                 viewMode === 'weekly' ? filteredWeeklyData.reduce((sum, w) => sum + w.tasksUpdated, 0) :
                 filteredMonthlyData.reduce((sum, m) => sum + m.tasksUpdated, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Tasks Completed</p>
              <p className="text-3xl font-bold text-green-900">
                {viewMode === 'daily' ? filteredDailyData.reduce((sum, d) => sum + d.tasksCompleted, 0) :
                 viewMode === 'weekly' ? filteredWeeklyData.reduce((sum, w) => sum + w.tasksCompleted, 0) :
                 filteredMonthlyData.reduce((sum, m) => sum + m.tasksCompleted, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-900">
                {viewMode === 'daily' ? 
                  (filteredDailyData.reduce((sum, d) => sum + d.tasksUpdated, 0) > 0 
                    ? Math.round((filteredDailyData.reduce((sum, d) => sum + d.tasksCompleted, 0) / filteredDailyData.reduce((sum, d) => sum + d.tasksUpdated, 0)) * 100)
                    : 0) :
                 viewMode === 'weekly' ?
                  (filteredWeeklyData.reduce((sum, w) => sum + w.tasksUpdated, 0) > 0
                    ? Math.round((filteredWeeklyData.reduce((sum, w) => sum + w.tasksCompleted, 0) / filteredWeeklyData.reduce((sum, w) => sum + w.tasksUpdated, 0)) * 100)
                    : 0) :
                  (filteredMonthlyData.reduce((sum, m) => sum + m.tasksUpdated, 0) > 0
                    ? Math.round((filteredMonthlyData.reduce((sum, m) => sum + m.tasksCompleted, 0) / filteredMonthlyData.reduce((sum, m) => sum + m.tasksUpdated, 0)) * 100)
                    : 0)}%
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {viewMode === 'daily' ? 'Daily Activity Trend' :
           viewMode === 'weekly' ? 'Weekly Activity Trend' :
           'Monthly Activity Trend'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={
            viewMode === 'daily' ? filteredDailyData.slice().reverse().map(d => ({
              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              updated: d.tasksUpdated,
              completed: d.tasksCompleted
            })) :
            viewMode === 'weekly' ? filteredWeeklyData.slice().reverse().map(w => ({
              date: w.week,
              updated: w.tasksUpdated,
              completed: w.tasksCompleted
            })) :
            filteredMonthlyData.slice().reverse().map(m => ({
              date: m.month,
              updated: m.tasksUpdated,
              completed: m.tasksCompleted
            }))
          }>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="updated" stroke="#3B82F6" name="Tasks Updated" strokeWidth={2} />
            <Line type="monotone" dataKey="completed" stroke="#10B981" name="Tasks Completed" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Reports */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Detailed {viewMode === 'daily' ? 'Daily' : viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Reports - {currentEmployee}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          {viewMode === 'daily' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDailyData.length > 0 ? filteredDailyData.map((day, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                        {day.tasksUpdated}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        {day.tasksCompleted}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">View Tasks ({day.tasks.length})</summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {day.tasks.map((task, i) => (
                            <div key={i} className="text-xs">
                              • {task.title} - <span className={`font-medium ${
                                task.status === 'completed' ? 'text-green-600' :
                                task.status === 'in_progress' ? 'text-yellow-600' :
                                'text-gray-600'
                              }`}>{task.status.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No daily activity recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {viewMode === 'weekly' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWeeklyData.length > 0 ? filteredWeeklyData.map((week, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{week.week}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                        {week.tasksUpdated}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        {week.tasksCompleted}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {week.tasksUpdated > 0 ? Math.round((week.tasksCompleted / week.tasksUpdated) * 100) : 0}%
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No weekly activity recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {viewMode === 'monthly' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMonthlyData.length > 0 ? filteredMonthlyData.map((month, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                        {month.tasksUpdated}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        {month.tasksCompleted}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {month.tasksUpdated > 0 ? Math.round((month.tasksCompleted / month.tasksUpdated) * 100) : 0}%
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No monthly activity recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
