'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface ReportData {
  period: {
    start: string
    end: string
    type: 'weekly' | 'monthly'
    year?: number
    month?: number
  }
  user: {
    id: string
    full_name: string
    email: string
    team: string
    department: string
  }
  summary: {
    tasks_received: number
    tasks_completed: number
    subtasks_completed: number
    total_work_items: number
    completion_rate: number
    total_hours: number
    work_log_hours: number
    subtask_hours: number
    days_logged: number
    total_days?: number
  }
  work_logs: any[]
  tasks: any[]
  subtasks: any[]
  weekly_breakdown?: any[]
}

export function WorkReportViewer() {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly')
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  // Fetch report data
  const { data: reportData, isLoading, error } = useQuery<ReportData>({
    queryKey: ['work-report', reportType, selectedDate],
    queryFn: async () => {
      let url = ''
      if (reportType === 'weekly') {
        // Calculate Monday of selected week
        const date = new Date(selectedDate)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
        const monday = new Date(date.setDate(diff))
        const weekStart = monday.toISOString().split('T')[0]
        
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/work-logs/weekly-report?week_start=${weekStart}`
      } else {
        const date = new Date(selectedDate)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/work-logs/monthly-report?year=${year}&month=${month}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch report')
      }
      
      const result = await response.json()
      return result.data
    },
    enabled: !!token && !!selectedDate
  })

  // Download PDF
  const downloadPDF = () => {
    if (!reportData) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    
    // Header
    doc.setFontSize(20)
    doc.setTextColor(37, 99, 235) // Blue color
    doc.text('Work Report', pageWidth / 2, 20, { align: 'center' })
    
    // Report Info
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`${reportType === 'weekly' ? 'Weekly' : 'Monthly'} Report`, pageWidth / 2, 28, { align: 'center' })
    doc.text(`Period: ${new Date(reportData.period.start).toLocaleDateString()} - ${new Date(reportData.period.end).toLocaleDateString()}`, pageWidth / 2, 33, { align: 'center' })
    
    // Employee Info
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Employee: ${reportData.user.full_name}`, 14, 45)
    doc.text(`Department: ${reportData.user.department || reportData.user.team}`, 14, 52)
    doc.text(`Email: ${reportData.user.email}`, 14, 59)
    
    // Summary Statistics
    doc.setFontSize(14)
    doc.setTextColor(37, 99, 235)
    doc.text('Summary Statistics', 14, 72)
    
    doc.setFontSize(10)
    doc.setTextColor(0)
    const summaryData = [
      ['Tasks Received', reportData.summary.tasks_received.toString()],
      ['Tasks Completed', reportData.summary.tasks_completed.toString()],
      ['Subtasks Completed', reportData.summary.subtasks_completed.toString()],
      ['Total Work Items', reportData.summary.total_work_items.toString()],
      ['Completion Rate', `${reportData.summary.completion_rate}%`],
      ['Total Hours', `${reportData.summary.total_hours.toFixed(1)}h`],
      ['Days Logged', `${reportData.summary.days_logged}${reportData.summary.total_days ? `/${reportData.summary.total_days}` : ''}`],
    ]
    
    ;(doc as any).autoTable({
      startY: 78,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    })

    // Work Logs
    if (reportData.work_logs.length > 0) {
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Daily Work Logs', 14, (doc as any).lastAutoTable.finalY + 15)
      
      const workLogData = reportData.work_logs.map(log => [
        new Date(log.log_date).toLocaleDateString(),
        `${log.hours_worked}h`,
        log.work_description.substring(0, 60) + (log.work_description.length > 60 ? '...' : '')
      ])
      
      ;(doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Hours', 'Work Description']],
        body: workLogData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 20 },
          2: { cellWidth: 'auto' }
        }
      })
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }

    // Save PDF
    const filename = `${reportType}_report_${reportData.user.full_name.replace(/\s+/g, '_')}_${reportData.period.start}_to_${reportData.period.end}.pdf`
    doc.save(filename)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'weekly' | 'monthly')}
              className="input"
            >
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {reportType === 'weekly' ? 'Select Week' : 'Select Month'}
            </label>
            <input
              type={reportType === 'weekly' ? 'date' : 'month'}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={downloadPDF}
              disabled={!reportData || isLoading}
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Display */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating report...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Failed to load report. Please try again.</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-blue-600 font-medium">Total Work Items</p>
              <p className="text-3xl font-bold text-blue-900">{reportData.summary.total_work_items}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-900">
                {reportData.summary.tasks_completed + reportData.summary.subtasks_completed}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-purple-600 font-medium">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-900">{reportData.summary.completion_rate}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-orange-600 font-medium">Total Hours</p>
              <p className="text-3xl font-bold text-orange-900">{reportData.summary.total_hours.toFixed(1)}h</p>
            </div>
          </div>

          {/* Work Logs Table */}
          {reportData.work_logs.length > 0 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Daily Work Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Achievements</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.work_logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {new Date(log.log_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.hours_worked}h</td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-md">{log.work_description}</td>
                        <td className="px-6 py-4 text-sm">
                          {((log.tasks_details && log.tasks_details.length > 0) || (log.subtasks_details && log.subtasks_details.length > 0)) ? (
                            <div className="space-y-2">
                              {log.tasks_details && log.tasks_details.length > 0 && (
                                <div className="text-xs">
                                  <div className="font-semibold text-blue-700 mb-1">Tasks ({log.tasks_details.length}):</div>
                                  <div className="space-y-1">
                                    {log.tasks_details.map((task: any, taskIdx: number) => (
                                      <div key={taskIdx} className="border-l-2 border-blue-400 pl-2 py-1">
                                        <div className="font-medium text-gray-900">{task.title}</div>
                                        <div className="flex gap-2 text-xs text-gray-600 mt-0.5">
                                          <span className="capitalize">{task.priority}</span>
                                          <span>•</span>
                                          <span className="capitalize">{task.status}</span>
                                        </div>
                                        {task.completed_at && (
                                          <div className="text-xs text-green-700 mt-0.5">
                                            ✓ {new Date(task.completed_at).toLocaleString('en-US', { 
                                              month: 'short', day: 'numeric', 
                                              hour: '2-digit', minute: '2-digit' 
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {log.subtasks_details && log.subtasks_details.length > 0 && (
                                <div className="text-xs">
                                  <div className="font-semibold text-purple-700 mb-1">Subtasks ({log.subtasks_details.length}):</div>
                                  <div className="space-y-1">
                                    {log.subtasks_details.map((subtask: any, subtaskIdx: number) => (
                                      <div key={subtaskIdx} className="border-l-2 border-purple-400 pl-2 py-1">
                                        <div className="font-medium text-gray-900">{subtask.title}</div>
                                        {subtask.completed_at && (
                                          <div className="text-xs text-green-700 mt-0.5">
                                            ✓ {new Date(subtask.completed_at).toLocaleString('en-US', { 
                                              month: 'short', day: 'numeric', 
                                              hour: '2-digit', minute: '2-digit' 
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.achievements || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
