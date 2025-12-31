'use client'

import { WorkProjection } from '@/types/entities'
import { Clock, Target, TrendingUp, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface ProjectionCardProps {
  projection: WorkProjection
  onEdit: (projection: WorkProjection) => void
  onDelete: (projection: WorkProjection) => void
  onUpdateActualHours: (id: number, hours: number) => void
}

export default function ProjectionCard({
  projection,
  onEdit,
  onDelete,
  onUpdateActualHours
}: ProjectionCardProps) {
  const progress = projection.actual_hours && projection.estimated_hours
    ? Math.round((projection.actual_hours / projection.estimated_hours) * 100)
    : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getProgressColor = () => {
    if (!projection.actual_hours) return 'bg-gray-300'
    if (projection.actual_hours > projection.estimated_hours) return 'bg-red-500'
    if (projection.actual_hours === projection.estimated_hours) return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {projection.project?.name || 'Unknown Project'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {projection.user?.full_name || 'Unknown User'} • {projection.team}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(projection.status)}`}>
            {projection.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {/* Hours Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center text-blue-600 mb-1">
              <Target className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium text-gray-600">Estimated</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{projection.estimated_hours}h</p>
          </div>
          
          <div className="text-center border-l border-r border-gray-200">
            <div className="flex items-center justify-center text-green-600 mb-1">
              <Clock className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium text-gray-600">Actual</span>
            </div>
            <div className="flex items-center justify-center">
              <input
                type="number"
                className="w-16 text-2xl font-bold text-center border-0 focus:ring-2 focus:ring-blue-500 rounded px-1"
                value={projection.actual_hours || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0
                  onUpdateActualHours(projection.id, value)
                }}
                placeholder="0"
                min="0"
              />
              <span className="text-2xl font-bold text-gray-900">h</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center text-purple-600 mb-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium text-gray-600">Variance</span>
            </div>
            <p className={`text-2xl font-bold ${
              (projection.actual_hours || 0) > projection.estimated_hours 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {(projection.actual_hours || 0) > projection.estimated_hours ? '+' : ''}
              {(projection.actual_hours || 0) - projection.estimated_hours}h
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-700 font-medium">Progress</span>
            <span className="text-gray-900 font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Notes */}
        {projection.notes && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700">{projection.notes}</p>
          </div>
        )}

        {/* Week Info */}
        <div className="text-xs text-gray-500 mb-4">
          <span>Week: {format(new Date(projection.week_start_date), 'MMM d')} - {format(new Date(projection.week_end_date), 'MMM d, yyyy')}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit(projection)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Edit2 className="w-4 h-4 mr-1" />
          Edit
        </button>
        <button
          onClick={() => onDelete(projection)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  )
}
