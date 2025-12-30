'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { X } from 'lucide-react'

interface WorkProjection {
  id: number
  week_start_date: string
  week_end_date: string
  project_id: number
  estimated_hours: number
  actual_hours?: number
  status: string
  notes?: string
  project?: { name: string }
}

interface EditProjectionModalProps {
  isOpen: boolean
  onClose: () => void
  projection: WorkProjection
  projects: Project[]
  onUpdate: (id: number, data: any) => Promise<void>
}

export default function EditProjectionModal({
  isOpen,
  onClose,
  projection,
  projects,
  onUpdate
}: EditProjectionModalProps) {
  const [formData, setFormData] = useState({
    project_id: '',
    estimated_hours: '',
    actual_hours: '',
    status: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (projection) {
      setFormData({
        project_id: projection.project_id.toString(),
        estimated_hours: projection.estimated_hours.toString(),
        actual_hours: (projection.actual_hours || '').toString(),
        status: projection.status,
        notes: projection.notes || ''
      })
    }
  }, [projection])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updateData: any = {
        project_id: parseInt(formData.project_id),
        estimated_hours: parseInt(formData.estimated_hours),
        status: formData.status,
        notes: formData.notes
      }

      if (formData.actual_hours) {
        updateData.actual_hours = parseInt(formData.actual_hours)
      }

      await onUpdate(projection.id, updateData)
      onClose()
    } catch (error) {
      console.error('Error updating projection:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Work Projection
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Week of {new Date(projection.week_start_date).toLocaleDateString()}
              </p>
            </div>

            {/* Body */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project
                  </label>
                  <select
                    required
                    className="input mt-1"
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="40"
                      className="input mt-1"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Actual Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="80"
                      className="input mt-1"
                      value={formData.actual_hours}
                      onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    required
                    className="input mt-1"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    className="input mt-1"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details about this projection..."
                  />
                </div>

                {/* Progress Indicator */}
                {formData.estimated_hours && formData.actual_hours && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">Progress</span>
                      <span className="font-medium text-gray-900">
                        {formData.actual_hours}h / {formData.estimated_hours}h
                        <span className="text-gray-500 ml-1">
                          ({Math.round((parseInt(formData.actual_hours) / parseInt(formData.estimated_hours)) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          parseInt(formData.actual_hours) > parseInt(formData.estimated_hours)
                            ? 'bg-red-600'
                            : parseInt(formData.actual_hours) === parseInt(formData.estimated_hours)
                            ? 'bg-green-600'
                            : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${Math.min((parseInt(formData.actual_hours) / parseInt(formData.estimated_hours)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary sm:ml-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
