'use client'

import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useProjects, useUsers } from '@/lib/hooks'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CreateTaskRequest, UpdateTaskRequest, Task, TaskComment, TaskAttachment } from '@/types'
import { tasksApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { uploadTaskFile, deleteTaskFile } from '@/lib/supabase/client'

function TasksContent() {
  const { user } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [filterAssignee, setFilterAssignee] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [newComment, setNewComment] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)
  const [taskDetails, setTaskDetails] = useState<{ comments: TaskComment[], attachments: TaskAttachment[] }>({ comments: [], attachments: [] })
  
  const [newTask, setNewTask] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    project_id: null,
    assigned_to: '',
    deadline: null
  })

  const { data: tasks = [], isLoading, error, refetch } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: users = [] } = useUsers()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  // Get unique departments from users
  const departments = useMemo(() => {
    const depts = new Set(
      users
        .map(u => u.department || u.team) // Use team as fallback
        .filter(Boolean) // Remove null/undefined/empty
        .filter(d => d !== 'undefined' && d !== 'null') // Remove string literals
    )
    const deptArray = Array.from(depts).sort()
    console.log('Users:', users.length, 'Departments found:', deptArray)
    return deptArray
  }, [users])

  // Get unique teams from users (alternative to departments)
  const teams = useMemo(() => {
    const teamSet = new Set(
      users
        .map(u => u.team)
        .filter(Boolean)
        .filter(t => t !== 'undefined' && t !== 'null')
    )
    return Array.from(teamSet).sort()
  }, [users])

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by department/team
      if (filterDepartment) {
        const assignedUser = users.find(u => u.id === task.assigned_to)
        if (!assignedUser) return false
        const userDept = assignedUser.department || assignedUser.team
        if (userDept !== filterDepartment) {
          return false
        }
      }
      
      // Filter by assignee
      if (filterAssignee && task.assigned_to !== filterAssignee) {
        return false
      }
      
      // Filter by status
      if (filterStatus && task.status !== filterStatus) {
        return false
      }
      
      return true
    })
  }, [tasks, users, filterDepartment, filterAssignee, filterStatus])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTask.mutateAsync(newTask)
    setShowCreateModal(false)
    setNewTask({ 
      title: '', 
      description: '', 
      status: 'pending',
      priority: 'medium',
      project_id: null,
      assigned_to: '',
      deadline: null
    })
  }

  const handleViewTask = async (task: Task) => {
    try {
      const fullTask = await tasksApi.getById(task.id)
      setTaskDetails({
        comments: (fullTask as any).comments || [],
        attachments: (fullTask as any).attachments || []
      })
      setViewingTask(fullTask)
    } catch (error) {
      toast.error('Failed to load task details')
    }
  }

  const handleEditTask = (task: Task) => {
    setViewingTask(null)
    setEditingTask(task)
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return
    
    const updateData: UpdateTaskRequest = {
      title: editingTask.title,
      description: editingTask.description,
      status: editingTask.status,
      priority: editingTask.priority,
      project_id: editingTask.project_id,
      assigned_to: editingTask.assigned_to,
      deadline: editingTask.deadline
    }
    
    await updateTask.mutateAsync({ id: editingTask.id, data: updateData })
    setEditingTask(null)
  }

  const handleDeleteTask = async (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id)
    }
  }

  const handleAddComment = async () => {
    if (!viewingTask || !newComment.trim()) return
    
    try {
      const comment = await tasksApi.addComment(viewingTask.id, newComment)
      setTaskDetails(prev => ({
        ...prev,
        comments: [...prev.comments, comment]
      }))
      setNewComment('')
      toast.success('Comment added successfully')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!viewingTask || !e.target.files?.[0]) return
    
    const file = e.target.files[0]
    
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB')
      e.target.value = ''
      return
    }
    
    setUploadingFile(true)
    
    try {
      // Upload file to Supabase Storage
      const { url: fileUrl } = await uploadTaskFile(file, viewingTask.id)
      
      const attachment = await tasksApi.addAttachment(viewingTask.id, {
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size
      })
      
      setTaskDetails(prev => ({
        ...prev,
        attachments: [attachment, ...prev.attachments]
      }))
      
      toast.success('File uploaded successfully')
      e.target.value = '' // Reset file input
    } catch (error: any) {
      console.error('Upload error:', error)
      const errorMessage = error?.message || 'Failed to upload file'
      if (errorMessage.includes('row-level security')) {
        toast.error('Storage permission error. Please contact administrator.')
      } else {
        toast.error(errorMessage)
      }
      e.target.value = ''
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!viewingTask || !confirm('Delete this attachment?')) return
    
    try {
      // Find the attachment to get the file URL
      const attachment = taskDetails.attachments.find(a => a.id === attachmentId)
      
      // Delete from database first
      await tasksApi.deleteAttachment(viewingTask.id, attachmentId)
      
      // Try to delete from storage (non-critical if it fails)
      if (attachment?.file_url) {
        try {
          await deleteTaskFile(attachment.file_url)
        } catch (storageError) {
          console.error('Failed to delete file from storage:', storageError)
          // Continue anyway - database record is already deleted
        }
      }
      
      setTaskDetails(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.id !== attachmentId)
      }))
      toast.success('Attachment deleted')
    } catch (error) {
      toast.error('Failed to delete attachment')
    }
  }

  const handleViewAttachment = (attachment: TaskAttachment) => {
    const fileExtension = attachment.file_name.split('.').pop()?.toLowerCase()
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
    const isImage = imageExtensions.includes(fileExtension || '')

    setPreviewFile({
      url: attachment.file_url,
      name: attachment.file_name,
      type: isImage ? 'image' : 'file'
    })
  }

  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      // Fetch the file and create a blob
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }
      const blob = await response.blob()
      
      // Create download link
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      window.URL.revokeObjectURL(blobUrl)
      toast.success('Download started')
    } catch (error) {
      console.error('Download error:', error)
      // Fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  const clearFilters = () => {
    setFilterDepartment('')
    setFilterAssignee('')
    setFilterStatus('')
  }

  if (error) {
    return <ErrorDisplay error={error} retry={refetch} title="Failed to load tasks" />
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage your tasks and assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          disabled={createTask.isPending}
        >
          Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Assignee
            </label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="input"
            >
              <option value="">All Assignees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {(filterDepartment || filterAssignee || filterStatus) && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        )}
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {tasks.length === 0 ? 'No tasks found' : 'No tasks match your filters'}
          </h3>
          <p className="text-gray-500">
            {tasks.length === 0 
              ? 'Create your first task to get started.' 
              : 'Try adjusting your filters to see more tasks.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTasks.map((task) => {
                const assignedUser = users.find(u => u.id === task.assigned_to)
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {task.project_name || projects.find(p => p.id === task.project_id)?.name || 'No Project'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {assignedUser?.full_name || task.assigned_user_name || 'Unknown'}
                      </div>
                      {assignedUser?.department && (
                        <div className="text-xs text-gray-500">{assignedUser.department}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {(task as any).creator?.full_name || task.creator_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(task.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(task.updated_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleViewTask(task)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Edit
                      </button>
                      {(user?.role === 'admin' || task.created_by === user?.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTask(task.id)
                          }}
                          className="text-red-600 hover:text-red-800"
                          disabled={deleteTask.isPending}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={newTask.project_id || ''}
                    onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To *
                  </label>
                  <select
                    required
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="input"
                  >
                    <option value="">Select User</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                    className="input"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newTask.deadline || ''}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value || null })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                  disabled={createTask.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={createTask.isPending}
                >
                  {createTask.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Task Modal with Comments & Attachments */}
      {viewingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingTask.title}</h2>
                <p className="text-gray-600 mt-1">{viewingTask.description}</p>
              </div>
              <button
                onClick={() => setViewingTask(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{viewingTask.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <p className="font-medium capitalize">{viewingTask.priority}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium">{(viewingTask as any).creator?.full_name || 'Unknown'}</p>
                <p className="text-xs text-gray-500">{new Date(viewingTask.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium">{new Date(viewingTask.updated_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">📎 Attachments</h3>
                <label className="btn btn-secondary cursor-pointer text-sm">
                  {uploadingFile ? 'Uploading...' : '+ Upload File'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </label>
              </div>
              {taskDetails.attachments.length > 0 ? (
                <div className="space-y-2">
                  {taskDetails.attachments.map((att) => (
                    <div key={att.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleViewAttachment(att)}
                      >
                        <p className="font-medium text-sm text-blue-600 hover:text-blue-800">{att.file_name}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded by {(att as any).uploader?.full_name} • {new Date(att.created_at).toLocaleDateString()}
                          {att.file_size && ` • ${(att.file_size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadAttachment(att.file_url, att.file_name)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm px-2"
                          title="Download"
                        >
                          ⬇️
                        </button>
                        {(user?.role === 'admin' || att.uploaded_by === user?.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteAttachment(att.id)
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded">No attachments</p>
              )}
            </div>

            {/* Comments Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">💬 Comments & Reviews</h3>
              
              {/* Add Comment Form */}
              <div className="mb-4 bg-gray-50 p-4 rounded">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={user?.role === 'admin' ? 'Add review or request changes...' : 'Add a comment...'}
                  className="input mb-2"
                  rows={3}
                />
                <button
                  onClick={handleAddComment}
                  className="btn btn-primary text-sm"
                  disabled={!newComment.trim()}
                >
                  {user?.role === 'admin' ? '✓ Add Review' : '+ Add Comment'}
                </button>
              </div>

              {/* Comments List */}
              {taskDetails.comments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {taskDetails.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 p-4 rounded border-l-4 border-blue-500">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{(comment as any).user?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded">No comments yet. Be the first to comment!</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => handleEditTask(viewingTask)}
                className="btn btn-primary flex-1"
              >
                Edit Task
              </button>
              <button
                onClick={() => setViewingTask(null)}
                className="btn btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Edit Task</h2>
            <form onSubmit={handleUpdateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={editingTask.project_id || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To *
                  </label>
                  <select
                    required
                    value={editingTask.assigned_to}
                    onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                    className="input"
                  >
                    <option value="">Select User</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                    className="input"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={editingTask.deadline ? editingTask.deadline.split('T')[0] : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value || null })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="btn btn-secondary flex-1"
                  disabled={updateTask.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">{previewFile.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadAttachment(previewFile.url, previewFile.name)}
                  className="btn btn-secondary text-sm"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl px-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4">
              {previewFile.type === 'image' ? (
                <img 
                  src={previewFile.url} 
                  alt={previewFile.name}
                  className="max-w-full h-auto mx-auto"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error('Image load error:', e)
                    toast.error('Failed to load image preview')
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <p className="text-sm text-gray-500 mb-4">{previewFile.name}</p>
                  <button
                    onClick={() => handleDownloadAttachment(previewFile.url, previewFile.name)}
                    className="btn btn-primary"
                  >
                    📥 Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <TasksContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}
