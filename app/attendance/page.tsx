'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { MapPin, Clock, CheckCircle2, XCircle, Calendar, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface AttendanceRecord {
  id: number
  user_id: string
  clock_in_time: string
  clock_out_time?: string
  clock_in_location: { lat: number; lng: number; accuracy: number }
  clock_out_location?: { lat: number; lng: number; accuracy: number }
  is_within_office: boolean
  total_hours?: number
  date: string
}

interface UserProfile {
  role: 'admin' | 'manager' | 'team_lead' | 'employee'
  full_name: string
  email: string
}

export default function AttendancePage() {
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const queryClient = useQueryClient()

  // Fetch current attendance status
  const { data: attendanceData, error: statusError, refetch } = useQuery({
    queryKey: ['attendance-status'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        const data = await response.json()
        console.log('🔍 Attendance API Response:', data)
        return data.data
      } catch (error) {
        console.error('❌ API Error:', error)
        // Return mock data for testing when API is down
        const mockAttendance = {
          id: 1,
          clock_in_time: '2026-01-02T09:00:00.000Z',
          clock_out_time: null, // null means still clocked in
          is_within_office: true
        }
        return {
          attendance: mockAttendance,
          canCheckIn: false,
          canCheckOut: true
        }
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const attendance = attendanceData?.attendance
  
  // Debug logging
  console.log('🔍 Attendance Debug:', {
    attendanceData,
    attendance,
    canCheckIn: attendanceData?.canCheckIn,
    canCheckOut: attendanceData?.canCheckOut
  })
  const office = attendanceData?.office

  // Fetch user profile to check role
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.user
    },
  })

  // Fetch personal attendance history
  const { data: attendanceHistory } = useQuery({
    queryKey: ['attendance-history'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/history?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error?.message || 'Failed to fetch history')
      return data.data
    },
  })

  const history = attendanceHistory?.attendance || []
  const summary = attendanceHistory?.summary || {}

  // Get current location
  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.')
      setIsGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position)
        setIsGettingLocation(false)
        console.log('📍 Location obtained:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => {
        let message = 'Unable to get your location.'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            message = 'Location request timed out.'
            break
        }
        setLocationError(message)
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!currentLocation) {
        throw new Error('Location is required')
      }

      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to clock in')
      }
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Clocked in successfully!')
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!currentLocation) {
        throw new Error('Location is required')
      }

      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to clock out')
      }
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Clocked out successfully!')
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleClockIn = () => {
    if (!currentLocation) {
      getCurrentLocation()
      toast.error('Please allow location access first')
      return
    }
    clockInMutation.mutate()
  }

  const handleClockOut = () => {
    if (!currentLocation) {
      getCurrentLocation()
      toast.error('Please allow location access first')
      return
    }
    clockOutMutation.mutate()
  }

  // Auto-get location on page load
  useEffect(() => {
    getCurrentLocation()
  }, [])

  // Use API response values for clock in/out availability with better fallbacks
  const canClockIn = attendanceData?.canCheckIn ?? (!attendance || !attendance.clock_in_time || attendance.clock_out_time)
  const canClockOut = attendanceData?.canCheckOut ?? (attendance && attendance.clock_in_time && !attendance.clock_out_time)

  console.log('🔍 Attendance Debug:', {
    attendanceData,
    attendance,
    canClockIn,
    canClockOut,
    apiCanCheckIn: attendanceData?.canCheckIn,
    apiCanCheckOut: attendanceData?.canCheckOut,
    hasClockInTime: attendance?.clock_in_time,
    hasClockOutTime: attendance?.clock_out_time
  })

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          {userProfile?.role === 'admin' && (
            <a
              href="/attendance/reports"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Reports
            </a>
          )}
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Clock In/Out Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Clock In/Out</h2>
            
            {/* Location Status */}
            <div className="mb-4">
              {isGettingLocation && (
                <div className="flex items-center text-blue-600 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Getting location...
                </div>
              )}
              
              {locationError && (
                <div className="flex items-center text-red-600 mb-2">
                  <XCircle className="w-4 h-4 mr-2" />
                  {locationError}
                </div>
              )}
              
              {currentLocation && !isGettingLocation && (
                <div className="flex items-center text-green-600 mb-2">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Location obtained (±{Math.round(currentLocation.coords.accuracy)}m)
                </div>
              )}

              <button
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Refresh Location
              </button>
            </div>

            {/* Clock In/Out Buttons */}
            <div className="space-y-3">
              {/* For testing - show current state */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Debug: canClockIn={canClockIn.toString()}, canClockOut={canClockOut.toString()}
              </div>
              
              {canClockIn && (
                <button
                  onClick={handleClockIn}
                  disabled={!currentLocation || clockInMutation.isPending}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
                </button>
              )}

              {canClockOut && (
                <button
                  onClick={handleClockOut}
                  disabled={!currentLocation || clockOutMutation.isPending}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
                </button>
              )}
              
              {!canClockIn && !canClockOut && (
                <div className="text-center text-gray-500 py-4">
                  No action available at this time
                </div>
              )}
            </div>
          </div>

          {/* Today's Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Status</h2>
            
            {attendance ? (
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${attendance.is_within_office ? 'text-green-600' : 'text-orange-600'}`} />
                  <span className={attendance.is_within_office ? 'text-green-600' : 'text-orange-600'}>
                    {attendance.is_within_office ? 'Present (In Office)' : 'Remote (Outside Office)'}
                  </span>
                </div>
                
                {attendance.clock_in_time && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>In: {new Date(attendance.clock_in_time).toLocaleTimeString()}</span>
                  </div>
                )}
                
                {attendance.clock_out_time ? (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Out: {new Date(attendance.clock_out_time).toLocaleTimeString()}</span>
                  </div>
                ) : attendance.clock_in_time ? (
                  <div className="flex items-center text-blue-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Still clocked in - ready to clock out</span>
                  </div>
                ) : null}

                {attendance.total_hours && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Total: {attendance.total_hours} hours</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center text-gray-500">
                <Clock className="w-4 h-4 mr-2" />
                <span>Not clocked in today - ready to clock in</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {summary && Object.keys(summary).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalDays || 0}</p>
              <p className="text-sm text-gray-600">Days Worked</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.validCheckIns || 0}</p>
              <p className="text-sm text-gray-600">Office Check-ins</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalHours || 0}h</p>
              <p className="text-sm text-gray-600">Total Hours</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.averageHours || 0}h</p>
              <p className="text-sm text-gray-600">Avg Per Day</p>
            </div>
          </div>
        )}

        {/* My Attendance History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">My Attendance History</h2>
            <p className="text-sm text-gray-600">Your recent attendance records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length > 0 ? history.map((record: AttendanceRecord) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.clock_in_time ? 
                        new Date(record.clock_in_time).toLocaleTimeString('en-US', {
                          hour12: true,
                          hour: 'numeric',
                          minute: '2-digit'
                        }) : '--'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.clock_out_time ? 
                        new Date(record.clock_out_time).toLocaleTimeString('en-US', {
                          hour12: true,
                          hour: 'numeric',
                          minute: '2-digit'
                        }) : '--'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.total_hours ? `${record.total_hours}h` : '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        record.is_within_office 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {record.is_within_office ? 'Office' : 'Remote'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No attendance records found</p>
                      <p className="text-sm">Start tracking your attendance by clocking in!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Office Location Info */}
        {office && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <h3 className="font-medium text-blue-900">{office.name}</h3>
                <p className="text-sm text-blue-700">
                  Attendance radius: {office.radius_meters}m from office location
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">How it works:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• You must be within {office?.radius_meters || 100}m of the office to be marked "Present"</li>
            <li>• Location access is required for attendance tracking</li>
            <li>• Clock in when you arrive, clock out when you leave</li>
            <li>• Your location is only checked during clock in/out actions</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}

