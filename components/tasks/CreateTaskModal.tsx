import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { CreateTaskForm, Project, User, TaskPriority, TaskStatus } from '@/types/enhanced'
import { SelectOption } from '@/types/enhanced'
import { FileUpload } from '@/components/ui/FileUpload'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTaskForm, files: File[]) => Promise<void>
  projects: Project[]
  users: User[]
  isLoading?: boolean
}

const priorityOptions: SelectOption<TaskPriority>[] = [
  { value: 'low', label: 'Low', description: 'Can be done when time permits' },
  { value: 'medium', label: 'Medium', description: 'Normal priority task' },
  { value: 'high', label: 'High', description: 'Important task, complete soon' },
  { value: 'critical', label: 'Critical', description: 'Urgent, needs immediate attention' },
]

const statusOptions: SelectOption<TaskStatus>[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  projects,
  users,
  isLoading = false
}: CreateTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskForm>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    project_id: null,
    assigned_to: '',
    deadline: null,
    estimated_hours: undefined,
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof CreateTaskForm, value: CreateTaskForm[keyof CreateTaskForm]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }

    if (formData.estimated_hours && formData.estimated_hours < 0) {
      newErrors.estimated_hours = 'Estimated hours must be positive'
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline)
      const today = new Date()
      if (deadlineDate < today) {
        newErrors.deadline = 'Deadline cannot be in the past'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData, selectedFiles)
      // Reset form on success
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        project_id: null,
        assigned_to: '',
        deadline: null,
        estimated_hours: undefined,
      })
      setSelectedFiles([])
      onClose()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      project_id: null,
      assigned_to: '',
      deadline: null,
      estimated_hours: undefined,
    })
    setSelectedFiles([])
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      size="lg"
      aria-labelledby="create-task-title"
    >
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={handleCancel}>
          <h3 id="create-task-title" className="text-lg font-medium text-gray-900">
            Create New Task
          </h3>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="task-title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter task title..."
                aria-describedby={errors.title ? "title-error" : undefined}
              />
              {errors.title && (
                <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="task-description"
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter task description..."
                aria-describedby={errors.description ? "description-error" : undefined}
              />
              {errors.description && (
                <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value} title={option.description}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="task-status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project */}
              <div>
                <label htmlFor="task-project" className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  id="task-project"
                  value={formData.project_id || ''}
                  onChange={(e) => handleChange('project_id', e.target.value ? Number(e.target.value) : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to
                </label>
                <select
                  id="task-assignee"
                  value={formData.assigned_to || ''}
                  onChange={(e) => handleChange('assigned_to', e.target.value || undefined)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deadline */}
              <div>
                <label htmlFor="task-deadline" className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  id="task-deadline"
                  value={formData.deadline || ''}
                  onChange={(e) => handleChange('deadline', e.target.value || null)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.deadline ? 'border-red-500' : 'border-gray-300'
                  }`}
                  aria-describedby={errors.deadline ? "deadline-error" : undefined}
                />
                {errors.deadline && (
                  <p id="deadline-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.deadline}
                  </p>
                )}
              </div>

              {/* Estimated Hours */}
              <div>
                <label htmlFor="task-estimated-hours" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  id="task-estimated-hours"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => handleChange('estimated_hours', e.target.value ? Number(e.target.value) : undefined)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.estimated_hours ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.0"
                  aria-describedby={errors.estimated_hours ? "estimated-hours-error" : undefined}
                />
                {errors.estimated_hours && (
                  <p id="estimated-hours-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.estimated_hours}
                  </p>
                )}
              </div>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachments (Optional)
              </label>
              <FileUpload
                onFilesChange={setSelectedFiles}
                maxFiles={5}
                maxSizeMB={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload relevant documents, images, or files for this task
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}