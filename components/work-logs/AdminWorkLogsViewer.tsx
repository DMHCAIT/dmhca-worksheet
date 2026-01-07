'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Calendar, User as UserIcon, Search, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface User {
  id: string
  full_name: string
  email: string
  department: string
  team: string
  role: string
}

interface WorkLog {
  id: number
  user_id: string
  log_date: string
  work_description: string
  tasks_completed: string
  hours_worked: number
  challenges: string
  achievements: string
  status: string
  created_at: string
  user?: User
}

export function AdminWorkLogsViewer() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      const result = await response.json()
      return result.data || []
    },
    enabled: !!token
  })

  // Fetch work logs for date range
  const { data: workLogs = [], isLoading, refetch } = useQuery<WorkLog[]>({
    queryKey: ['admin-work-logs', selectedDate, selectedUser],
    queryFn: async () => {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/work-logs/range?start_date=${selectedDate}&end_date=${selectedDate}${selectedUser !== 'all' ? `&user_id=${selectedUser}` : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch work logs')
      const result = await response.json()
      return result.data || []
    },
    enabled: !!token && !!selectedDate
  })

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(
      users
        .map(u => u.department || u.team)
        .filter((d): d is string => Boolean(d))
    )
    return Array.from(depts).sort()
  }, [users])

  // Filter work logs
  const filteredWorkLogs = useMemo(() => {
    return workLogs.filter(log => {
      // Department filter
      if (selectedDepartment !== 'all') {
        const userDept = log.user?.department || log.user?.team || ''
        if (userDept !== selectedDepartment) return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const userName = log.user?.full_name?.toLowerCase() || ''
        const description = log.work_description?.toLowerCase() || ''
        const tasks = log.tasks_completed?.toLowerCase() || ''
        
        if (!userName.includes(query) && !description.includes(query) && !tasks.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [workLogs, selectedDepartment, searchQuery])

  // Download day-wise report for all users
  const downloadDayReport = () => {
    if (filteredWorkLogs.length === 0) {
      alert('No work logs found for this date')
      return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    
    // Header
    doc.setFontSize(20)
    doc.setTextColor(37, 99, 235)
    doc.text('Daily Work Logs Report', pageWidth / 2, 20, { align: 'center' })
    
    // Date
    doc.setFontSize(12)
    doc.setTextColor(100)
    const dateObj = new Date(selectedDate)
    doc.text(`Date: ${dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 28, { align: 'center' })
    
    // Summary
    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text(`Total Employees Logged: ${filteredWorkLogs.length}`, 14, 40)
    const totalHours = filteredWorkLogs.reduce((sum, log) => sum + parseFloat(log.hours_worked?.toString() || '0'), 0)
    doc.text(`Total Hours Worked: ${totalHours.toFixed(1)}h`, 14, 46)
    
    if (selectedDepartment !== 'all') {
      doc.text(`Department: ${selectedDepartment}`, 14, 52)
    }
    
    // Work logs table
    const tableData = filteredWorkLogs.map(log => [
      log.user?.full_name || 'Unknown',
      log.user?.department || log.user?.team || 'N/A',
      `${log.hours_worked || 0}h`,
      (log.work_description || '').substring(0, 40) + ((log.work_description?.length || 0) > 40 ? '...' : ''),
      (log.tasks_completed || '').substring(0, 30) + ((log.tasks_completed?.length || 0) > 30 ? '...' : '')
    ])

    ;(doc as any).autoTable({
      startY: selectedDepartment !== 'all' ? 58 : 52,
      head: [['Employee', 'Department', 'Hours', 'Work Description', 'Tasks Completed']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 15 },
        3: { cellWidth: 50 },
        4: { cellWidth: 40 }
      }
    })

    // Detailed logs on new pages
    filteredWorkLogs.forEach((log, index) => {
      if (index > 0) doc.addPage()
      
      doc.setFontSize(16)
      doc.setTextColor(37, 99, 235)
      doc.text(log.user?.full_name || 'Unknown User', 14, 20)
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Department: ${log.user?.department || log.user?.team || 'N/A'}`, 14, 28)
      doc.text(`Hours Worked: ${log.hours_worked || 0}h`, 14, 34)
      doc.text(`Status: ${log.status || 'N/A'}`, 14, 40)
      
      // Work Description
      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Work Description:', 14, 52)
      doc.setFontSize(10)
      const descLines = doc.splitTextToSize(log.work_description || 'No description provided', pageWidth - 28)
      doc.text(descLines, 14, 60)
      
      let yPos = 60 + (descLines.length * 5) + 10
      
      // Tasks Completed
      if (log.tasks_completed) {
        doc.setFontSize(12)
        doc.text('Tasks Completed:', 14, yPos)
        doc.setFontSize(10)
        const taskLines = doc.splitTextToSize(log.tasks_completed, pageWidth - 28)
        doc.text(taskLines, 14, yPos + 8)
        yPos += 8 + (taskLines.length * 5) + 10
      }
      
      // Achievements
      if (log.achievements) {
        doc.setFontSize(12)
        doc.text('Achievements:', 14, yPos)
        doc.setFontSize(10)
        const achLines = doc.splitTextToSize(log.achievements, pageWidth - 28)
        doc.text(achLines, 14, yPos + 8)
        yPos += 8 + (achLines.length * 5) + 10
      }
      
      // Challenges
      if (log.challenges) {
        doc.setFontSize(12)
        doc.text('Challenges:', 14, yPos)
        doc.setFontSize(10)
        const chalLines = doc.splitTextToSize(log.challenges, pageWidth - 28)
        doc.text(chalLines, 14, yPos + 8)
      }
    })

    doc.save(`work-logs-${selectedDate}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">All Users Work Logs</h2>
        <p className="text-blue-100">View and download day-wise reports for all employees</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="w-4 h-4 inline mr-1" />
              Filter by User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter by Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={downloadDayReport}
            disabled={filteredWorkLogs.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download Day Report ({filteredWorkLogs.length} logs)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Logs</div>
          <div className="text-3xl font-bold text-blue-600">{filteredWorkLogs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Hours</div>
          <div className="text-3xl font-bold text-green-600">
            {filteredWorkLogs.reduce((sum, log) => sum + parseFloat(log.hours_worked?.toString() || '0'), 0).toFixed(1)}h
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Hours/Employee</div>
          <div className="text-3xl font-bold text-purple-600">
            {filteredWorkLogs.length > 0
              ? (filteredWorkLogs.reduce((sum, log) => sum + parseFloat(log.hours_worked?.toString() || '0'), 0) / filteredWorkLogs.length).toFixed(1)
              : '0.0'}h
          </div>
        </div>
      </div>

      {/* Work Logs List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Work Logs for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              Loading work logs...
            </div>
          ) : filteredWorkLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No work logs found</p>
              <p className="text-sm">Try selecting a different date or adjusting filters</p>
            </div>
          ) : (
            filteredWorkLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {log.user?.full_name || 'Unknown User'}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>{log.user?.department || log.user?.team || 'No Department'}</span>
                      <span>•</span>
                      <span>{log.user?.email}</span>
                      <span>•</span>
                      <span className="font-medium text-blue-600">{log.hours_worked || 0} hours</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    log.status === 'submitted' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {log.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Work Description:</div>
                    <p className="text-sm text-gray-600">{log.work_description || 'No description'}</p>
                  </div>

                  {log.tasks_completed && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Tasks Completed:</div>
                      <p className="text-sm text-gray-600">{log.tasks_completed}</p>
                    </div>
                  )}

                  {log.achievements && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Achievements:</div>
                      <p className="text-sm text-gray-600">{log.achievements}</p>
                    </div>
                  )}

                  {log.challenges && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Challenges:</div>
                      <p className="text-sm text-gray-600">{log.challenges}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📊 Admin Features</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>View work logs for all employees across the organization</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Filter by date, user, department, or search by keywords</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Download comprehensive day-wise reports in PDF format</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>View summary statistics including total hours and completion rates</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
