'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Calendar, CheckCircle2, Clock } from 'lucide-react'

interface WorkLog {
  id: number
  user_id: string
  log_date: string
  work_description: string
  tasks_completed: string[]
  hours_worked: number
  challenges: string
  achievements: string
  status: string
  created_at: string
  updated_at: string
}

export function DailyWorkLogForm() {
  const [workLog, setWorkLog] = useState({
    work_description: '',
    tasks_completed: [] as string[],
    hours_worked: 0,
    challenges: '',
    achievements: ''
  })

  const queryClient = useQueryClient()
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  // Fetch today's work log
  const { data: todayLog, isLoading } = useQuery<WorkLog | null>({
    queryKey: ['work-log-today'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-logs/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()
      return result.data
    },
    enabled: !!token
  })

  // Load existing log data
  useEffect(() => {
    if (todayLog) {
      setWorkLog({
        work_description: todayLog.work_description || '',
        tasks_completed: todayLog.tasks_completed || [],
        hours_worked: todayLog.hours_worked || 0,
        challenges: todayLog.challenges || '',
        achievements: todayLog.achievements || ''
      })
    }
  }, [todayLog])

  // Save work log mutation
  const saveWorkLog = useMutation({
    mutationFn: async (data: typeof workLog) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-logs/today`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to save work log')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-log-today'] })
      toast.success('Work log saved successfully! ✅')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save work log')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveWorkLog.mutate(workLog)
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Daily Work Log</h2>
              <p className="text-blue-100 text-sm">{today}</p>
            </div>
          </div>
          {todayLog && (
            <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Submitted</span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Work Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What did you work on today? *
          </label>
          <textarea
            required
            rows={4}
            value={workLog.work_description}
            onChange={(e) => setWorkLog({ ...workLog, work_description: e.target.value })}
            className="input"
            placeholder="Describe your main activities and accomplishments for today..."
          />
          <p className="text-xs text-gray-500 mt-1">Be specific about tasks, meetings, and key deliverables</p>
        </div>

        {/* Hours Worked */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Hours Worked
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={workLog.hours_worked}
            onChange={(e) => setWorkLog({ ...workLog, hours_worked: parseFloat(e.target.value) || 0 })}
            className="input max-w-xs"
            placeholder="8.0"
          />
        </div>

        {/* Achievements */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Key Achievements & Milestones
          </label>
          <textarea
            rows={3}
            value={workLog.achievements}
            onChange={(e) => setWorkLog({ ...workLog, achievements: e.target.value })}
            className="input"
            placeholder="List any significant accomplishments, completed tasks, or milestones reached..."
          />
        </div>

        {/* Challenges */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Challenges & Blockers
          </label>
          <textarea
            rows={3}
            value={workLog.challenges}
            onChange={(e) => setWorkLog({ ...workLog, challenges: e.target.value })}
            className="input"
            placeholder="Note any obstacles, issues, or areas where you need support..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {todayLog ? 'Last updated: ' + new Date(todayLog.updated_at).toLocaleTimeString() : 'Not yet submitted today'}
          </p>
          <button
            type="submit"
            disabled={saveWorkLog.isPending}
            className="btn btn-primary px-6"
          >
            {saveWorkLog.isPending ? 'Saving...' : todayLog ? 'Update Log' : 'Submit Log'}
          </button>
        </div>
      </form>
    </div>
  )
}
