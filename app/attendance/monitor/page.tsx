'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Calendar, Clock, MapPin, Users, Filter, RefreshCw, Download, Search, Eye } from 'lucide-react'
import { useAdaptiveQueryOptions } from '@/lib/hooks/usePerformanceOptimization'
import toast from 'react-hot-toast'

interface AttendanceRecord {
  id: number
  user_id: string
  user_name: string
  user_email: string
  user_department: string
  user_role: string
  branch_name: string
  branch_id: number
  clock_in_time: string
  clock_out_time?: string
  clock_in_location: { lat: number; lng: number; accuracy: number }
  clock_out_location?: { lat: number; lng: number; accuracy: number }
  is_within_office: boolean
  total_hours?: number
  date: string
  status: 'active' | 'completed' | 'incomplete'
  created_at: string
}

interface LiveAttendance {
  user_id: string
  user_name: string
  user_email: string
  department: string
  branch_name: string
  status: 'clocked_in' | 'clocked_out' | 'not_started'
  clock_in_time?: string
  hours_worked?: number
  is_within_office: boolean
  last_location?: { lat: number; lng: number }
}

interface MonitoringStats {
  totalEmployees: number
  currentlyWorking: number
  onTimeToday: number
  lateToday: number
  averageHours: number
  absentToday: number
  remoteWorking: number
  officeWorking: number
}

interface Office {
  id: number
  name: string
  latitude: number
  longitude: number
  cycle_type: string
  work_start_time: string
  work_end_time: string
}

export default function AttendanceMonitorPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'live' | 'records'>('live')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch office locations
  const { data: offices } = useQuery<Office[]>({
    queryKey: ['office-locations'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/office-locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.success ? data.data : []
    }
  })

  // Adaptive polling for attendance monitoring (important priority)
  const attendancePollingOptions = useAdaptiveQueryOptions('important', autoRefresh)

  // Fetch live attendance status - optimized polling
  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery<{
    stats: MonitoringStats
    attendances: LiveAttendance[]
  }>({
    queryKey: ['live-attendance', selectedBranch],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      if (selectedBranch) params.append('branch', selectedBranch)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/live?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.success ? data.data : { stats: {}, attendances: [] }
    },
    enabled: attendancePollingOptions.enabled,
    refetchInterval: attendancePollingOptions.refetchInterval,
    refetchIntervalInBackground: attendancePollingOptions.refetchIntervalInBackground,
    refetchOnWindowFocus: attendancePollingOptions.refetchOnWindowFocus,
    refetchOnMount: attendancePollingOptions.refetchOnMount,
    staleTime: attendancePollingOptions.staleTime,
  })

  // Fetch attendance records
  const { data: recordsData, isLoading: recordsLoading, refetch: refetchRecords } = useQuery<{
    records: AttendanceRecord[]
  }>({
    queryKey: ['attendance-records', selectedDate, selectedBranch, selectedDepartment, selectedStatus],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      params.append('date', selectedDate)
      if (selectedBranch) params.append('branch', selectedBranch)
      if (selectedDepartment) params.append('department', selectedDepartment)
      if (selectedStatus) params.append('status', selectedStatus)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/records?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.success ? data.data : { records: [] }
    }
  })

  // Filter functions
  const filteredLiveData = liveData?.attendances?.filter(attendance => {
    const matchesSearch = searchTerm === '' || 
      attendance.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = selectedDepartment === '' || attendance.department === selectedDepartment
    return matchesSearch && matchesDepartment
  }) || []

  const filteredRecords = recordsData?.records?.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  }) || []

  // Export function
  const exportData = () => {
    const headers = viewMode === 'live' 
      ? ['Name', 'Email', 'Department', 'Branch', 'Status', 'Clock In', 'Hours Worked', 'Location']
      : ['Name', 'Email', 'Department', 'Branch', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Location']
    
    const csvData = viewMode === 'live' 
      ? (filteredLiveData as LiveAttendance[]).map(item => [
          item.user_name,
          item.user_email,
          item.department,
          item.branch_name,
          item.status.replace('_', ' ').toUpperCase(),
          item.clock_in_time || '--',
          item.hours_worked?.toFixed(2) + 'h' || '--',
          item.is_within_office ? 'Office' : 'Remote'
        ])
      : (filteredRecords as AttendanceRecord[]).map(item => [
          item.user_name,
          item.user_email,
          item.user_department,
          item.branch_name,
          item.date,
          item.clock_in_time || '--',
          item.clock_out_time || '--',
          item.total_hours?.toFixed(2) + 'h' || '--',
          item.status.toUpperCase(),
          item.is_within_office ? 'Office' : 'Remote'
        ])
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${viewMode}-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--'
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (hours?: number) => {
    if (!hours) return '--'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in': return 'bg-green-100 text-green-800'
      case 'clocked_out': return 'bg-blue-100 text-blue-800'
      case 'not_started': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'incomplete': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && viewMode === 'live') {
      const interval = setInterval(() => {
        refetchLive()
      }, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, viewMode, refetchLive])

  const stats = liveData?.stats || {
    totalEmployees: 0,
    currentlyWorking: 0,
    onTimeToday: 0,
    lateToday: 0,
    averageHours: 0,
    absentToday: 0,
    remoteWorking: 0,
    officeWorking: 0
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Monitor</h1>
            <p className="text-gray-600">Real-time attendance monitoring and records</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('live')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'live' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Eye className="w-4 h-4 mr-2 inline" />
                Live Status
              </button>
              <button
                onClick={() => setViewMode('records')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'records' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2 inline" />
                Records
              </button>
            </div>
            
            <button
              onClick={exportData}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Currently Working</p>
                <p className="text-2xl font-bold text-gray-900">{stats.currentlyWorking}</p>
                <p className="text-xs text-green-600">
                  {stats.totalEmployees > 0 && Math.round((stats.currentlyWorking / stats.totalEmployees) * 100)}% active
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">On Time Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.onTimeToday}</p>
                <p className="text-xs text-purple-600">
                  {stats.lateToday} late arrivals
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MapPin className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Office / Remote</p>
                <p className="text-2xl font-bold text-gray-900">{stats.officeWorking}/{stats.remoteWorking}</p>
                <p className="text-xs text-indigo-600">
                  {stats.absentToday} absent today
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Branches</option>
                {offices?.map((office) => (
                  <option key={office.id} value={office.name}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>

            {viewMode === 'records' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="active">Active</option>
                    <option value="incomplete">Incomplete</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {viewMode === 'live' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auto Refresh</label>
                <div className="flex items-center space-x-3 mt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                    />
                    <span className="ml-2 text-sm text-gray-600">10s</span>
                  </label>
                  <button
                    onClick={() => refetchLive()}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === 'live' ? 'Live Attendance Status' : 'Attendance Records'}
            </h3>
            <p className="text-sm text-gray-600">
              {viewMode === 'live' ? filteredLiveData.length : filteredRecords.length} records found
            </p>
          </div>
          
          {(liveLoading || recordsLoading) ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading attendance data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {viewMode === 'live' ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLiveData.map((attendance) => (
                      <tr key={attendance.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{attendance.user_name}</div>
                            <div className="text-sm text-gray-500">{attendance.user_email}</div>
                            <div className="text-xs text-gray-400">{attendance.department}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {attendance.branch_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(attendance.status)}`}>
                            {attendance.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(attendance.clock_in_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(attendance.hours_worked)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            attendance.is_within_office 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {attendance.is_within_office ? 'Office' : 'Remote'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{record.user_name}</div>
                            <div className="text-sm text-gray-500">{record.user_email}</div>
                            <div className="text-xs text-gray-400">{record.user_department}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.branch_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.clock_in_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.clock_out_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(record.total_hours)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}`}>
                            {record.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.is_within_office 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {record.is_within_office ? 'Office' : 'Remote'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}