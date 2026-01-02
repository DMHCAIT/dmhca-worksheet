'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { MapPin, Clock, CheckCircle2, XCircle } from 'lucide-react'
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const attendance = attendanceData?.attendance
  const office = attendanceData?.office

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

  const canClockIn = !attendance || !attendance.clock_in_time
  const canClockOut = attendance && attendance.clock_in_time && !attendance.clock_out_time

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Attendance</h1>

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
                
                {attendance.clock_out_time && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Out: {new Date(attendance.clock_out_time).toLocaleTimeString()}</span>
                  </div>
                )}

                {attendance.total_hours && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Total: {attendance.total_hours} hours</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">
                Not clocked in today
              </div>
            )}
          </div>
        </div>

        {/* Office Location Info */}
        {office && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
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
      if (!data.success) throw new Error(data.error?.message || 'Failed to fetch status')
      return data.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch attendance history
  const { data: history } = useQuery<{ attendance: AttendanceRecord[]; summary: any }>({
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

  // Get current location
  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      setIsGettingLocation(true)
      setLocationError(null)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false)
          setCurrentLocation(position)
          resolve(position)
        },
        (error) => {
          setIsGettingLocation(false)
          let message = 'Failed to get location'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please enable location permissions.'
              break
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable.'
              break
            case error.TIMEOUT:
              message = 'Location request timed out.'
              break
          }
          setLocationError(message)
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    })
  }

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Check if current location is within office geofence
  const isWithinGeofence = (): boolean => {
    if (!currentLocation || !status?.office) return false
    const distance = calculateDistance(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      status.office.latitude,
      status.office.longitude
    )
    return distance <= status.office.geofence_radius
  }

  // Check in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const position = await getCurrentLocation()
      const token = localStorage.getItem('authToken')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      })
      
      const data = await response.json()
      if (!data.success) throw new Error(data.error?.message || 'Check-in failed')
      return data.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] })
      refetch()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const position = await getCurrentLocation()
      const token = localStorage.getItem('authToken')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      })
      
      const data = await response.json()
      if (!data.success) throw new Error(data.error?.message || 'Check-out failed')
      return data.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['attendance-status'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] })
      refetch()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Get location on page load
  useEffect(() => {
    getCurrentLocation().catch(() => {
      // Ignore error, will be shown in UI
    })
  }, [])

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Not recorded'
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (statusError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800">Error Loading Attendance</h3>
            <p className="text-red-600">{(statusError as Error).message}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const withinGeofence = isWithinGeofence()
  const today = status?.attendance
  const office = status?.office

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="text-gray-600">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Location Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Current Location</h3>
            {isGettingLocation ? (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Getting location...
              </div>
            ) : locationError ? (
              <div className="text-red-600">
                <p>{locationError}</p>
                <button
                  onClick={() => getCurrentLocation()}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-1"
                >
                  Try again
                </button>
              </div>
            ) : currentLocation ? (
              <div>
                <p className="text-sm text-gray-600">
                  Lat: {currentLocation.coords.latitude.toFixed(6)}, 
                  Lng: {currentLocation.coords.longitude.toFixed(6)}
                </p>
                <p className="text-sm text-gray-600">
                  Accuracy: ±{Math.round(currentLocation.coords.accuracy)}m
                </p>
                <div className={`mt-2 px-2 py-1 rounded text-sm font-medium ${
                  withinGeofence 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {withinGeofence ? '✓ Within office area' : '✗ Outside office area'}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Location not available</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Office Location</h3>
            {office ? (
              <div>
                <p className="text-gray-900 font-medium">{office.office_name}</p>
                <p className="text-sm text-gray-600">{office.address}</p>
                <p className="text-sm text-gray-600">
                  Geofence: {office.geofence_radius}m radius
                </p>
                <p className="text-sm text-gray-600">
                  Hours: {office.working_hours_start} - {office.working_hours_end}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Office settings not configured</p>
            )}
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today&apos;s Attendance</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Check In</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(today?.check_in_time)}
              </p>
              {today?.is_valid_checkin === false && (
                <p className="text-xs text-red-600">Outside office area</p>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Check Out</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTime(today?.check_out_time)}
              </p>
              {today?.check_out_time && today?.is_valid_checkout === false && (
                <p className="text-xs text-red-600">Outside office area</p>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-lg font-semibold text-gray-900">
                {today?.total_hours ? `${today.total_hours.toFixed(2)}h` : '0.00h'}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => checkInMutation.mutate()}
              disabled={!status?.canCheckIn || checkInMutation.isPending || !currentLocation}
              className={`px-6 py-3 rounded-lg font-medium ${
                status?.canCheckIn && currentLocation
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
            </button>

            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={!status?.canCheckOut || checkOutMutation.isPending || !currentLocation}
              className={`px-6 py-3 rounded-lg font-medium ${
                status?.canCheckOut && currentLocation
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
            </button>
          </div>

          {!currentLocation && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 text-sm">
                📍 Location access is required for attendance. Please enable location permissions and click &quot;Try again&quot; above.
              </p>
            </div>
          )}

          {currentLocation && !withinGeofence && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-orange-800 text-sm">
                ⚠️ You are outside the office area. You can still check in/out, but it will be marked as invalid.
              </p>
            </div>
          )}
        </div>

        {/* Recent Attendance History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Attendance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history?.attendance?.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {formatTime(record.check_in_time)}
                        {record.is_valid_checkin === false && (
                          <span className="ml-1 text-red-500 text-xs">⚠️</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {formatTime(record.check_out_time)}
                        {record.check_out_time && record.is_valid_checkout === false && (
                          <span className="ml-1 text-red-500 text-xs">⚠️</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.total_hours ? `${record.total_hours.toFixed(2)}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        record.status === 'checked_out' 
                          ? 'bg-green-100 text-green-800' 
                          : record.status === 'checked_in'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!history?.attendance || history.attendance.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        {history?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{history.summary.totalDays}</p>
              <p className="text-sm text-gray-600">Total Days</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{history.summary.validCheckIns}</p>
              <p className="text-sm text-gray-600">Valid Check-ins</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{history.summary.totalHours}h</p>
              <p className="text-sm text-gray-600">Total Hours</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{history.summary.averageHours}h</p>
              <p className="text-sm text-gray-600">Avg Hours/Day</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}