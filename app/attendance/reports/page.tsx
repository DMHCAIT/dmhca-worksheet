'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Calendar, Clock, MapPin, Search, Download, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

interface AttendanceRecord {
  id: number
  user_id: string
  user_name: string
  user_email: string
  user_department: string
  branch_name: string
  branch_cycle: string
  clock_in_time: string
  clock_out_time?: string
  clock_in_location: { lat: number; lng: number; accuracy: number }
  clock_out_location?: { lat: number; lng: number; accuracy: number }
  is_within_office: boolean
  is_within_working_hours: boolean
  total_hours?: number
  date: string
  created_at: string
}

interface BranchSummary {
  name: string
  cycle: string
  totalRecords: number
  presentEmployees: number
  onTimeEmployees: number
  totalHours: number
}

interface Office {
  id: number
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  work_start_time: string
  work_end_time: string
  cycle_type: string
  cycle_start_day: number
}

interface AttendanceSummary {
  totalEmployees: number
  presentToday: number
  onTimeToday: number
  onTimeCount: number
  validLocation: number
  totalHours: number
  averageHours: number
  branchSummary: BranchSummary[]
}

export default function AttendanceReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('today') // today, week, month, current_period

  // Fetch office locations for branch filtering
  const { data: offices, isLoading: officesLoading, error: officesError } = useQuery<Office[]>({
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
      console.log('📍 Office locations response:', data)
      return data.success ? data.data : []
    },
  })

  // Fetch all attendance records (admin only)
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-reports', selectedDate, selectedEmployee, selectedBranch, dateRange],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams({
        date: selectedDate,
        range: dateRange,
        ...(selectedEmployee && { employee: selectedEmployee }),
        ...(selectedBranch && { branch: selectedBranch })
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error?.message || 'Failed to fetch reports')
      return data.data
    },
  })

  // Fetch employees list for filtering
  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (!data.success) throw new Error('Failed to fetch employees')
      return data.data
    },
  })

  const records: AttendanceRecord[] = attendanceData?.records || []
  const summary: AttendanceSummary = attendanceData?.summary || {}
  
  // Filter records by search term
  const filteredRecords = records.filter(record => 
    record.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Employee', 
      'Email',
      'Branch',
      'Cycle Type',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Time Status',
      'Within Working Hours',
      'Location Status'
    ]
    
    const csvData = filteredRecords.map(record => {
      const clockInTime = record.clock_in_time ? new Date(`2000-01-01T${record.clock_in_time}`) : null
      const isOnTime = clockInTime && clockInTime <= new Date('2000-01-01T10:00:00')
      
      return [
        formatDate(record.date),
        record.user_name || 'Unknown',
        record.user_email || '',
        record.branch_name || 'Not Set',
        record.branch_cycle === 'calendar' ? 'Calendar (1-31)' : 'Custom (26-25)',
        formatTime(record.clock_in_time),
        formatTime(record.clock_out_time),
        record.total_hours ? `${record.total_hours.toFixed(2)}h` : '--',
        isOnTime ? 'On Time' : 'Late',
        record.is_within_working_hours ? 'Yes' : 'No',
        record.is_within_office ? 'Office' : 'Remote'
      ]
    })
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${selectedBranch || 'all-branches'}-${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
            <p className="text-gray-600">View and manage all employee attendance records</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalEmployees || 0}</p>
                {selectedBranch && (
                  <p className="text-xs text-blue-600">{selectedBranch}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-gray-900">{summary.presentToday || 0}</p>
                {summary.totalEmployees > 0 && (
                  <p className="text-xs text-green-600">
                    {Math.round(((summary.presentToday || 0) / summary.totalEmployees) * 100)}% attendance
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">On Time Today</p>
                <p className="text-2xl font-bold text-gray-900">{summary.onTimeToday || 0}</p>
                {summary.presentToday > 0 && (
                  <p className="text-xs text-purple-600">
                    {Math.round(((summary.onTimeToday || 0) / summary.presentToday) * 100)}% on time
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Avg Hours</p>
                <p className="text-2xl font-bold text-gray-900">{summary.averageHours || 0}h</p>
                <p className="text-xs text-orange-600">Standard: 9h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MapPin className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Valid Location</p>
                <p className="text-2xl font-bold text-gray-900">{summary.validLocation || 0}</p>
                {summary.presentToday > 0 && (
                  <p className="text-xs text-indigo-600">
                    {Math.round(((summary.validLocation || 0) / summary.presentToday) * 100)}% valid
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Branches</option>
                {officesLoading && <option disabled>Loading branches...</option>}
                {officesError && <option disabled>Error loading branches</option>}
                {offices?.length === 0 && <option disabled>No branches found</option>}
                {offices?.map((office) => (
                  <option key={office.id} value={office.name}>
                    {office.name} 
                    {office.cycle_type === 'calendar' ? ' (1st-31st)' : ' (26th-25th)'}
                  </option>
                ))}
              </select>
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mt-1">
                  Debug: {offices?.length || 0} offices loaded
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">Current Cycle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specific Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Employees</option>
                {employees?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          {/* Branch-specific information */}
          {selectedBranch && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-4 text-sm text-blue-800">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Working Hours: 10:00 AM - 7:00 PM
                </span>
                {offices?.find(o => o.name === selectedBranch)?.cycle_type === 'calendar' ? (
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Attendance Cycle: 1st to End of Month
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Attendance Cycle: 26th to 25th
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Attendance Records</h3>
            <p className="text-sm text-gray-600">{filteredRecords.length} records found</p>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading attendance records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => {
                    const clockInTime = record.clock_in_time ? new Date(`2000-01-01T${record.clock_in_time}`) : null
                    const isOnTime = clockInTime && clockInTime <= new Date('2000-01-01T10:00:00')
                    const isLate = clockInTime && clockInTime > new Date('2000-01-01T10:00:00')
                    
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.user_name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.user_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span>{record.branch_name || 'Not Set'}</span>
                            {record.branch_cycle && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({record.branch_cycle === 'calendar' ? '1-31' : '26-25'})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span>{formatTime(record.clock_in_time)}</span>
                            {isLate && (
                              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full" title="Late arrival"></span>
                            )}
                            {isOnTime && (
                              <span className="ml-2 w-2 h-2 bg-green-500 rounded-full" title="On time"></span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.clock_out_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.total_hours ? `${record.total_hours.toFixed(2)}h` : '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.is_within_working_hours !== undefined ? (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              record.is_within_working_hours 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.is_within_working_hours ? 'Within Hours' : 'Outside Hours'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">--</span>
                          )}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}