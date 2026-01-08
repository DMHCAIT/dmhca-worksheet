'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Calendar, User as UserIcon, Search, Filter, FileSpreadsheet } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface User {
  id: string
  full_name: string
  email: string
  department: string
  team: string
  role: string
}

interface Task {
  id: number
  title: string
  description: string
  priority: string
  status: string
  assigned_to: string
  created_at: string
  completed_at: string
  due_date: string
}

interface Subtask {
  id: number
  title: string
  description: string
  status: string
  created_at: string
  completed_at: string
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
  updated_at?: string
  user?: User
  tasks_details?: Task[]
  subtasks_details?: Subtask[]
  total_tasks_count?: number
  total_subtasks_count?: number
  completed_tasks_count?: number
  completed_subtasks_count?: number
}

export function AdminWorkLogsViewer() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    today.setDate(today.getDate() - 7) // Default to last 7 days
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')

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

  // Fetch work logs for date range with task details
  const { data: workLogs = [], isLoading, refetch } = useQuery<WorkLog[]>({
    queryKey: ['admin-work-logs-with-tasks', startDate, endDate, selectedUser],
    queryFn: async () => {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/work-logs/range-with-tasks?start_date=${startDate}&end_date=${endDate}${selectedUser !== 'all' ? `&user_id=${selectedUser}` : ''}`
      
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
    enabled: !!token && !!startDate && !!endDate
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

  // Download comprehensive Excel report with task details for ALL users
  const downloadExcelReport = () => {
    if (workLogs.length === 0) {
      alert('No work logs found for this date range')
      return
    }

    // Use ALL work logs, not filtered
    const logsToExport = workLogs

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Summary
    const summaryData = logsToExport.map(log => ({
      'Employee': log.user?.full_name || 'Unknown',
      'Department': log.user?.department || log.user?.team || 'N/A',
      'Email': log.user?.email || 'N/A',
      'Date': new Date(log.log_date).toLocaleDateString(),
      'Submitted': log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A',
      'Hours Worked': log.hours_worked || 0,
      'Tasks Count': (log.completed_tasks_count || 0) + (log.completed_subtasks_count || 0),
      'Completed Tasks': log.completed_tasks_count || 0,
      'Completed Subtasks': log.completed_subtasks_count || 0,
      'Status': log.status || 'N/A'
    }))
    const ws1 = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

    // Sheet 2: Detailed Work Logs
    const detailedData = logsToExport.map(log => ({
      'Employee': log.user?.full_name || 'Unknown',
      'Department': log.user?.department || log.user?.team || 'N/A',
      'Date': new Date(log.log_date).toLocaleDateString(),
      'Submitted': log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A',
      'Last Updated': log.updated_at && log.updated_at !== log.created_at ? new Date(log.updated_at).toLocaleString() : 'N/A',
      'Hours Worked': log.hours_worked || 0,
      'Work Description': log.work_description || 'N/A',
      'Tasks Completed Summary': log.tasks_completed || 'N/A',
      'Achievements': log.achievements || 'N/A',
      'Challenges': log.challenges || 'N/A',
      'Status': log.status || 'N/A'
    }))
    const ws2 = XLSX.utils.json_to_sheet(detailedData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Work Details')

    // Sheet 3: Task Details
    const taskDetailsData: any[] = []
    logsToExport.forEach(log => {
      // Add completed tasks
      log.tasks_details?.forEach(task => {
        taskDetailsData.push({
          'Employee': log.user?.full_name || 'Unknown',
          'Department': log.user?.department || log.user?.team || 'N/A',
          'Log Date': new Date(log.log_date).toLocaleDateString(),
          'Type': 'Task',
          'Task Title': task.title,
          'Description': task.description || 'N/A',
          'Priority': task.priority || 'N/A',
          'Status': task.status,
          'Assigned Date': task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A',
          'Completed Date': task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'N/A',
          'Due Date': task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'
        })
      })

      // Add completed subtasks
      log.subtasks_details?.forEach(subtask => {
        taskDetailsData.push({
          'Employee': log.user?.full_name || 'Unknown',
          'Department': log.user?.department || log.user?.team || 'N/A',
          'Log Date': new Date(log.log_date).toLocaleDateString(),
          'Type': 'Subtask',
          'Task Title': subtask.title,
          'Description': subtask.description || 'N/A',
          'Priority': 'N/A',
          'Status': subtask.status,
          'Assigned Date': subtask.created_at ? new Date(subtask.created_at).toLocaleDateString() : 'N/A',
          'Completed Date': subtask.completed_at ? new Date(subtask.completed_at).toLocaleDateString() : 'N/A',
          'Due Date': 'N/A'
        })
      })
    })
    
    if (taskDetailsData.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(taskDetailsData)
      XLSX.utils.book_append_sheet(wb, ws3, 'Task Details')
    }

    // Sheet 4: Employee Performance
    const performanceData = logsToExport.map(log => ({
      'Employee': log.user?.full_name || 'Unknown',
      'Department': log.user?.department || log.user?.team || 'N/A',
      'Date': new Date(log.log_date).toLocaleDateString(),
      'Total Hours': log.hours_worked || 0,
      'Total Work Items': (log.total_tasks_count || 0) + (log.total_subtasks_count || 0),
      'Tasks Worked On': log.total_tasks_count || 0,
      'Tasks Completed': log.completed_tasks_count || 0,
      'Subtasks Worked On': log.total_subtasks_count || 0,
      'Subtasks Completed': log.completed_subtasks_count || 0,
      'Task Completion Rate': log.total_tasks_count 
        ? `${Math.round((log.completed_tasks_count || 0) / log.total_tasks_count * 100)}%`
        : 'N/A',
      'Has Achievements': log.achievements ? 'Yes' : 'No',
      'Has Challenges': log.challenges ? 'Yes' : 'No'
    }))
    const ws4 = XLSX.utils.json_to_sheet(performanceData)
    XLSX.utils.book_append_sheet(wb, ws4, 'Performance Metrics')

    // Download the file
    const fileName = startDate === endDate 
      ? `work-logs-${startDate}.xlsx`
      : `work-logs-${startDate}_to_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Generate HTML preview
  const generatePreview = () => {
    if (workLogs.length === 0) {
      alert('No work logs found')
      return
    }

    const logsToExport = workLogs
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const dateRangeText = startDate === endDate 
      ? startDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : `${startDateObj.toLocaleDateString()} - ${endDateObj.toLocaleDateString()}`

    const totalHours = logsToExport.reduce((sum, log) => sum + parseFloat(log.hours_worked?.toString() || '0'), 0)
    const totalTasks = logsToExport.reduce((sum, log) => sum + (log.completed_tasks_count || 0) + (log.completed_subtasks_count || 0), 0)

    let html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto;">
        <h1 style="color: #2563eb; text-align: center;">Work Logs Report</h1>
        <p style="text-align: center; color: #666; font-size: 14px;">${dateRangeText}</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">Summary</h3>
          <p>Total Employees: <strong>${logsToExport.length}</strong></p>
          <p>Total Hours Worked: <strong>${totalHours.toFixed(1)}h</strong></p>
          <p>Total Tasks Completed: <strong>${totalTasks}</strong></p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 10px; text-align: left;">Employee</th>
              <th style="padding: 10px; text-align: left;">Department</th>
              <th style="padding: 10px; text-align: left;">Date</th>
              <th style="padding: 10px; text-align: left;">Submitted</th>
              <th style="padding: 10px; text-align: left;">Hours</th>
              <th style="padding: 10px; text-align: left;">Tasks</th>
            </tr>
          </thead>
          <tbody>
    `

    logsToExport.forEach((log, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
      const tasksText = Array.isArray(log.tasks_completed) 
        ? log.tasks_completed.join(', ') 
        : (log.tasks_completed || 'N/A')
      
      const submissionTime = log.created_at 
        ? new Date(log.created_at).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          })
        : 'N/A'
      
      html += `
        <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px;">${log.user?.full_name || 'Unknown'}</td>
          <td style="padding: 10px;">${log.user?.department || log.user?.team || 'N/A'}</td>
          <td style="padding: 10px;">${new Date(log.log_date).toLocaleDateString()}</td>
          <td style="padding: 10px; color: #059669; font-weight: 500;">${submissionTime}</td>
          <td style="padding: 10px;">${log.hours_worked || 0}h</td>
          <td style="padding: 10px;">${(log.completed_tasks_count || 0) + (log.completed_subtasks_count || 0)} items</td>
        </tr>
        <tr style="background: ${bgColor};">
          <td colspan="6" style="padding: 10px 10px 20px 30px;">
            <div style="margin-bottom: 10px;">
              <strong>Work Description:</strong><br/>
              ${log.work_description || 'N/A'}
            </div>
            ${tasksText !== 'N/A' ? `
              <div style="margin-bottom: 10px;">
                <strong>Tasks:</strong><br/>
                ${tasksText}
              </div>
            ` : ''}
            ${log.tasks_details && log.tasks_details.length > 0 ? `
              <div style="background: #eff6ff; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #3b82f6;">
                <strong style="color: #1e40af;">Completed Tasks (${log.tasks_details.length}):</strong>
                <ul style="margin: 5px 0; list-style: none; padding-left: 0;">
                  ${log.tasks_details.map(task => `
                    <li style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #60a5fa;">
                      <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${task.title}</div>
                      ${task.description ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${task.description}</div>` : ''}
                      <div style="font-size: 11px; color: #4b5563;">
                        <span style="background: ${task.priority === 'urgent' ? '#fee2e2' : task.priority === 'high' ? '#fef3c7' : '#e0e7ff'}; 
                                     color: ${task.priority === 'urgent' ? '#991b1b' : task.priority === 'high' ? '#92400e' : '#3730a3'}; 
                                     padding: 2px 6px; border-radius: 3px; text-transform: capitalize;">
                          ${task.priority}
                        </span>
                        <span style="margin: 0 5px;">•</span>
                        <span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; text-transform: capitalize;">
                          ${task.status}
                        </span>
                      </div>
                      <div style="margin-top: 6px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px;">
                        ${task.created_at ? `<div><strong>Assigned:</strong> ${new Date(task.created_at).toLocaleString()}</div>` : ''}
                        ${task.due_date ? `<div><strong>Due:</strong> ${new Date(task.due_date).toLocaleDateString()}</div>` : ''}
                        ${task.completed_at ? `<div style="color: #059669;"><strong>✓ Completed:</strong> ${new Date(task.completed_at).toLocaleString()}</div>` : ''}
                      </div>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            ${log.subtasks_details && log.subtasks_details.length > 0 ? `
              <div style="background: #faf5ff; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid #a855f7;">
                <strong style="color: #6b21a8;">Completed Subtasks (${log.subtasks_details.length}):</strong>
                <ul style="margin: 5px 0; list-style: none; padding-left: 0;">
                  ${log.subtasks_details.map(subtask => `
                    <li style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #c084fc;">
                      <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${subtask.title}</div>
                      ${subtask.description ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${subtask.description}</div>` : ''}
                      <div style="font-size: 11px;">
                        <span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; text-transform: capitalize;">
                          ${subtask.status}
                        </span>
                      </div>
                      <div style="margin-top: 6px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px;">
                        ${subtask.created_at ? `<div><strong>Created:</strong> ${new Date(subtask.created_at).toLocaleString()}</div>` : ''}
                        ${subtask.completed_at ? `<div style="color: #059669;"><strong>✓ Completed:</strong> ${new Date(subtask.completed_at).toLocaleString()}</div>` : ''}
                      </div>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            ${log.achievements ? `
              <div style="margin-top: 10px;">
                <strong>Achievements:</strong><br/>
                ${log.achievements}
              </div>
            ` : ''}
            ${log.challenges ? `
              <div style="margin-top: 10px;">
                <strong>Challenges:</strong><br/>
                ${log.challenges}
              </div>
            ` : ''}
          </td>
        </tr>
      `
    })

    html += `
          </tbody>
        </table>
      </div>
    `

    setPreviewContent(html)
    setShowPreview(true)
  }

  // Download PDF report for all users
  const downloadDayReport = () => {
    if (workLogs.length === 0) {
      alert('No work logs found for this date range')
      return
    }

    // Use ALL work logs
    const logsToExport = workLogs

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    
    // Header
    doc.setFontSize(20)
    doc.setTextColor(37, 99, 235)
    doc.text('Work Logs Report', pageWidth / 2, 20, { align: 'center' })
    
    // Date Range
    doc.setFontSize(12)
    doc.setTextColor(100)
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const dateRangeText = startDate === endDate 
      ? `Date: ${startDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
      : `Period: ${startDateObj.toLocaleDateString()} - ${endDateObj.toLocaleDateString()}`
    doc.text(dateRangeText, pageWidth / 2, 28, { align: 'center' })
    
    // Summary
    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text(`Total Employees: ${logsToExport.length}`, 14, 40)
    const totalHours = logsToExport.reduce((sum, log) => sum + parseFloat(log.hours_worked?.toString() || '0'), 0)
    doc.text(`Total Hours Worked: ${totalHours.toFixed(1)}h`, 14, 46)
    const totalTasks = logsToExport.reduce((sum, log) => sum + (log.completed_tasks_count || 0) + (log.completed_subtasks_count || 0), 0)
    doc.text(`Total Tasks Completed: ${totalTasks}`, 14, 52)
    
    // Work logs table
    const tableData = logsToExport.map(log => {
      const tasksText = Array.isArray(log.tasks_completed) 
        ? log.tasks_completed.join(', ') 
        : String(log.tasks_completed || '')
      
      // Format submission time
      const submissionTime = log.created_at 
        ? new Date(log.created_at).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          })
        : 'N/A'
      
      return [
        log.user?.full_name || 'Unknown',
        log.user?.department || log.user?.team || 'N/A',
        `${log.hours_worked || 0}h`,
        submissionTime,
        (log.work_description || '').substring(0, 35) + ((log.work_description?.length || 0) > 35 ? '...' : ''),
        tasksText.substring(0, 25) + (tasksText.length > 25 ? '...' : '')
      ]
    })

    ;(doc as any).autoTable({
      startY: 58,
      head: [['Employee', 'Department', 'Hours', 'Submitted', 'Work Description', 'Tasks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 12 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40 },
        5: { cellWidth: 35 }
      }
    })

    // Detailed logs on new pages
    logsToExport.forEach((log, index) => {
      if (index > 0) doc.addPage()
      
      doc.setFontSize(16)
      doc.setTextColor(37, 99, 235)
      doc.text(log.user?.full_name || 'Unknown User', 14, 20)
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Department: ${log.user?.department || log.user?.team || 'N/A'}`, 14, 28)
      doc.text(`Hours Worked: ${log.hours_worked || 0}h`, 14, 34)
      doc.text(`Status: ${log.status || 'N/A'}`, 14, 40)
      
      // Add submission timestamp
      if (log.created_at) {
        const submissionTime = new Date(log.created_at).toLocaleString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })
        doc.text(`Submitted: ${submissionTime}`, 14, 46)
      }
      
      // Add update timestamp if different
      if (log.updated_at && log.updated_at !== log.created_at) {
        const updateTime = new Date(log.updated_at).toLocaleString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })
        doc.text(`Last Updated: ${updateTime}`, 14, 52)
      }
      
      // Work Description
      doc.setFontSize(12)
      doc.setTextColor(0)
      let yPos = 65  // Start lower to account for timestamp info
      doc.text('Work Description:', 14, yPos)
      doc.setFontSize(10)
      const descLines = doc.splitTextToSize(log.work_description || 'No description provided', pageWidth - 28)
      doc.text(descLines, 14, yPos + 8)
      
      yPos = yPos + 8 + (descLines.length * 5) + 10
      
      // Tasks Completed
      if (log.tasks_completed) {
        doc.setFontSize(12)
        doc.text('Tasks Completed:', 14, yPos)
        doc.setFontSize(10)
        const tasksText = Array.isArray(log.tasks_completed) 
          ? log.tasks_completed.join(', ') 
          : log.tasks_completed
        const taskLines = doc.splitTextToSize(tasksText, pageWidth - 28)
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

    const fileName = startDate === endDate 
      ? `work-logs-${startDate}.pdf`
      : `work-logs-${startDate}_to_${endDate}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">All Users Work Logs</h2>
        <p className="text-blue-100">View and download custom range reports for all employees</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Quick Report Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const today = new Date()
              const todayStr = today.toISOString().split('T')[0]
              setStartDate(todayStr)
              setEndDate(todayStr)
              setReportType('daily')
            }}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
          >
            📅 Today
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const monday = new Date(today)
              monday.setDate(today.getDate() - today.getDay() + 1)
              const saturday = new Date(monday)
              saturday.setDate(monday.getDate() + 5)
              setStartDate(monday.toISOString().split('T')[0])
              setEndDate(saturday.toISOString().split('T')[0])
              setReportType('weekly')
            }}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
          >
            📊 This Week (Mon-Sat)
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
              const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
              setStartDate(firstDay.toISOString().split('T')[0])
              setEndDate(lastDay.toISOString().split('T')[0])
              setReportType('monthly')
            }}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
          >
            📈 This Month
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const lastWeekStart = new Date(today)
              lastWeekStart.setDate(today.getDate() - today.getDay() - 6)
              const lastWeekEnd = new Date(lastWeekStart)
              lastWeekEnd.setDate(lastWeekStart.getDate() + 5)
              setStartDate(lastWeekStart.toISOString().split('T')[0])
              setEndDate(lastWeekEnd.toISOString().split('T')[0])
              setReportType('weekly')
            }}
            className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium"
          >
            ⏮️ Last Week
          </button>
          <button
            onClick={() => {
              const today = new Date()
              const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
              const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
              setStartDate(lastMonth.toISOString().split('T')[0])
              setEndDate(lastMonthEnd.toISOString().split('T')[0])
              setReportType('monthly')
            }}
            className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 text-sm font-medium"
          >
            ⏮️ Last Month
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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

        {/* Download Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Viewing:</span> {filteredWorkLogs.length} of {workLogs.length} logs
            {startDate === endDate ? ' (1 day)' : ` (${Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days)`}
            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {reportType === 'daily' ? '📅 Daily' : reportType === 'weekly' ? '📊 Weekly' : '📈 Monthly'} Report
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={generatePreview}
              disabled={workLogs.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Report
            </button>
            <button
              onClick={downloadExcelReport}
              disabled={workLogs.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
              title="Downloads ALL users' data (ignores filters)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel ({workLogs.length})
            </button>
            <button
              onClick={downloadDayReport}
              disabled={workLogs.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Downloads ALL users' data (ignores filters)"
            >
              <Download className="w-4 h-4" />
              PDF ({workLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="text-sm text-gray-600 mb-1">Tasks Completed</div>
          <div className="text-3xl font-bold text-purple-600">
            {filteredWorkLogs.reduce((sum, log) => sum + (log.completed_tasks_count || 0) + (log.completed_subtasks_count || 0), 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {filteredWorkLogs.reduce((sum, log) => sum + (log.completed_tasks_count || 0), 0)} tasks + {' '}
            {filteredWorkLogs.reduce((sum, log) => sum + (log.completed_subtasks_count || 0), 0)} subtasks
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Hours/Employee</div>
          <div className="text-3xl font-bold text-orange-600">
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
            {startDate === endDate 
              ? `Work Logs for ${new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
              : `Work Logs from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
            }
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
              <p className="text-sm">Try selecting a different date range or adjusting filters</p>
              {workLogs.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  ({workLogs.length} logs available - adjust filters to view)
                </p>
              )}
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
                      <span>•</span>
                      <span className="text-gray-500">
                        {new Date(log.log_date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      {log.created_at && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            📝 Submitted: {new Date(log.created_at).toLocaleString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </>
                      )}
                      {log.updated_at && log.updated_at !== log.created_at && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600 font-medium">
                            ✏️ Updated: {new Date(log.updated_at).toLocaleString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </>
                      )}
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
                      <div className="text-sm font-medium text-gray-700 mb-1">Tasks Summary:</div>
                      <p className="text-sm text-gray-600">{log.tasks_completed}</p>
                    </div>
                  )}

                  {/* Task Details */}
                  {((log.tasks_details && log.tasks_details.length > 0) || (log.subtasks_details && log.subtasks_details.length > 0)) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        📋 Completed Work Items: {(log.completed_tasks_count || 0) + (log.completed_subtasks_count || 0)}
                      </div>
                      
                      {log.tasks_details && log.tasks_details.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-blue-800 mb-2">Tasks Completed ({log.tasks_details.length}):</div>
                          <div className="space-y-2">
                            {log.tasks_details.map((task, idx) => (
                              <div key={idx} className="bg-white rounded p-3 text-xs border-l-4 border-blue-500 shadow-sm">
                                <div className="font-semibold text-gray-900 mb-1">{task.title}</div>
                                {task.description && (
                                  <div className="text-gray-600 mb-2 text-xs">{task.description}</div>
                                )}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">Priority:</span>
                                    <span className="ml-1 font-medium capitalize px-2 py-0.5 rounded text-xs"
                                      style={{
                                        backgroundColor: task.priority === 'urgent' ? '#fee2e2' : task.priority === 'high' ? '#fef3c7' : '#e0e7ff',
                                        color: task.priority === 'urgent' ? '#991b1b' : task.priority === 'high' ? '#92400e' : '#3730a3'
                                      }}>
                                      {task.priority}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Status:</span>
                                    <span className="ml-1 font-medium capitalize px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                      {task.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2 space-y-1 text-xs border-t pt-2">
                                  {task.created_at && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 font-medium">Assigned:</span>
                                      <span className="text-gray-700">
                                        {new Date(task.created_at).toLocaleString('en-US', { 
                                          month: 'short', day: 'numeric', year: 'numeric', 
                                          hour: '2-digit', minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {task.due_date && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 font-medium">Due Date:</span>
                                      <span className="text-gray-700">
                                        {new Date(task.due_date).toLocaleDateString('en-US', { 
                                          month: 'short', day: 'numeric', year: 'numeric' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {task.completed_at && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600 font-medium">✓ Completed:</span>
                                      <span className="text-green-700 font-medium">
                                        {new Date(task.completed_at).toLocaleString('en-US', { 
                                          month: 'short', day: 'numeric', year: 'numeric', 
                                          hour: '2-digit', minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {log.subtasks_details && log.subtasks_details.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-blue-800 mb-2">Subtasks Completed ({log.subtasks_details.length}):</div>
                          <div className="space-y-2">
                            {log.subtasks_details.map((subtask, idx) => (
                              <div key={idx} className="bg-white rounded p-3 text-xs border-l-4 border-purple-500 shadow-sm">
                                <div className="font-semibold text-gray-900 mb-1">{subtask.title}</div>
                                {subtask.description && (
                                  <div className="text-gray-600 mb-2 text-xs">{subtask.description}</div>
                                )}
                                <div className="mb-2">
                                  <span className="text-gray-500">Status:</span>
                                  <span className="ml-1 font-medium capitalize px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                    {subtask.status}
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs border-t pt-2">
                                  {subtask.created_at && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 font-medium">Created:</span>
                                      <span className="text-gray-700">
                                        {new Date(subtask.created_at).toLocaleString('en-US', { 
                                          month: 'short', day: 'numeric', year: 'numeric', 
                                          hour: '2-digit', minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  {subtask.completed_at && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600 font-medium">✓ Completed:</span>
                                      <span className="text-green-700 font-medium">
                                        {new Date(subtask.completed_at).toLocaleString('en-US', { 
                                          month: 'short', day: 'numeric', year: 'numeric', 
                                          hour: '2-digit', minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
            <span>View work logs for all employees across the organization with detailed task information</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Select custom date ranges to analyze work logs over any period</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Filter by date, user, department, or search by keywords (filters don't affect downloads)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Download comprehensive Excel reports with task completion details for ALL users</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Download PDF reports for quick overview and sharing - always includes all users</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>View when tasks were assigned and when they were completed for better tracking</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Track employee performance with completion rates and hours worked statistics</span>
          </li>
        </ul>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowPreview(false)}
            ></div>

            {/* Modal */}
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Report Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Preview Content */}
                <div 
                  className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={() => {
                    downloadDayReport()
                    setShowPreview(false)
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    downloadExcelReport()
                    setShowPreview(false)
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download Excel
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
