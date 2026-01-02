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

