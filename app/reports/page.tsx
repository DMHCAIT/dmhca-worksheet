'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useTasks, useUsers } from '@/lib/hooks'
import { useAuth } from '@/lib/auth/AuthProvider'
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
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()
  const { data: users = [] } = useUsers()

  // Generate daily activity reports
  const dailyReports = useMemo(() => {
    const reports: Record<string, DailyActivity[]> = {}
    
    tasks.forEach(task => {
      const updatedDate = new Date(task.updated_at)
      const dateKey = updatedDate.toISOString().split('T')[0]
      
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
  }, [tasks, users])

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
  const currentEmployee = selectedEmployee || (user?.role === 'employee' ? user.full_name : Object.keys(dailyReports)[0] || '')
  
  const filteredDailyData = dailyReports[currentEmployee] || []
  const filteredWeeklyData = weeklyReports[currentEmployee] || []
  const filteredMonthlyData = monthlyReports[currentEmployee] || []

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(user?.role === 'admin' || user?.role === 'team_lead') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={currentEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="input"
              >
                {Object.keys(dailyReports).map(employee => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
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
              Export Options
            </label>
            <button className="btn btn-secondary w-full">
              📊 Export to Excel
            </button>
          </div>
        </div>
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
