'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DailyWorkLogForm } from '@/components/work-logs/DailyWorkLogForm'
import { WorkReportViewer } from '@/components/work-logs/WorkReportViewer'
import { Calendar, FileBarChart } from 'lucide-react'

function WorkLogsContent() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'daily' | 'reports'>('daily')

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Work Logs & Reports</h1>
        <p className="text-gray-600 mt-2">Track your daily work and view performance reports</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'daily'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            Daily Work Log
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'reports'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileBarChart className="w-5 h-5 inline mr-2" />
            Weekly & Monthly Reports
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {activeTab === 'daily' ? (
          <div className="max-w-4xl">
            <DailyWorkLogForm />
            
            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Daily Log Instructions</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Submit your work log <strong>daily</strong> before end of day</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Be specific about tasks completed and challenges faced</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your logs will be included in weekly and monthly performance reports</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You can update today's log multiple times if needed</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <WorkReportViewer />
            
            {/* Report Info */}
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">📊 Report Information</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-800">
                <div>
                  <h4 className="font-semibold mb-2">Weekly Reports (Monday - Saturday)</h4>
                  <ul className="space-y-1">
                    <li>• Shows 6-day work week summary</li>
                    <li>• Tasks received and completed</li>
                    <li>• Subtasks and total hours</li>
                    <li>• Daily work log entries</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Monthly Reports (1st - End of Month)</h4>
                  <ul className="space-y-1">
                    <li>• Complete month overview</li>
                    <li>• Weekly breakdown included</li>
                    <li>• Completion rates and trends</li>
                    <li>• Downloadable as PDF</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function WorkLogsPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <WorkLogsContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}
