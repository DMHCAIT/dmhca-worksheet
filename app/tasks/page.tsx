'use client'

import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useAddTaskComment, useProjects, useUsers } from '@/lib/hooks'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CreateTaskRequest, UpdateTaskRequest, Task, TaskComment, TaskAttachment, ProjectionSubtask, TaskStatus } from '@/types'
import { tasksApi } from '@/lib/api/tasks'
import toast from 'react-hot-toast'
import { uploadTaskFile, deleteTaskFile } from '@/lib/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUpload } from '@/components/ui/FileUpload'
import SubtaskViewModal from '@/components/SubtaskViewModal'

function TasksContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingSubtask, setEditingSubtask] = useState<ProjectionSubtask | null>(null)
  const [viewingSubtask, setViewingSubtask] = useState<ProjectionSubtask | null>(null)
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [filterAssignee, setFilterAssignee] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [newComment, setNewComment] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)
  const [taskDetails, setTaskDetails] = useState<{ comments: TaskComment[], attachments: TaskAttachment[] }>({ comments: [], attachments: [] })
  const [createTaskFiles, setCreateTaskFiles] = useState<File[]>([])
  
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
  const addTaskComment = useAddTaskComment()

  // Fetch assigned projection subtasks
  const { data: subtasks = [], isLoading: subtasksLoading } = useQuery<ProjectionSubtask[]>({
    queryKey: ['my-subtasks'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projections/my-subtasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.data || []
    },
  })

  // Get unique departments from users
  const departments = useMemo(() => {
    const depts = new Set(
      users
        .map(u => u.department || u.team) // Use team as fallback
        .filter((d): d is string => Boolean(d)) // Remove null/undefined/empty with type guard
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
        if (!assignedUser) {
          console.log('Task has no assigned user:', task.id, task.assigned_to)
          return false
        }
        const userDept = (assignedUser.department || assignedUser.team || '').toLowerCase().trim()
        const filterDept = filterDepartment.toLowerCase().trim()
        console.log('Comparing:', { userDept, filterDept, match: userDept === filterDept })
        if (userDept !== filterDept) {
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
      
      // Filter by date range
      if (filterDateFrom || filterDateTo) {
        const taskDate = task.deadline || task.created_at
        if (!taskDate) return false
        
        const taskDateObj = new Date(taskDate)
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (taskDateObj < fromDate) return false
        }
        
        if (filterDateTo) {
          const toDate = new Date(filterDateTo)
          toDate.setHours(23, 59, 59, 999)
          if (taskDateObj > toDate) return false
        }
      }
      
      return true
    })
  }, [tasks, users, filterDepartment, filterAssignee, filterStatus, filterDateFrom, filterDateTo])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Create the task first
      const result = await createTask.mutateAsync(newTask)
      const createdTask = result as any
      
      // Upload files if any
      if (createTaskFiles.length > 0 && createdTask?.id) {
        setUploadingFile(true)
        for (const file of createTaskFiles) {
          try {
            const { url } = await uploadTaskFile(file, createdTask.id)
            await tasksApi.addAttachment(createdTask.id.toString(), {
              file_name: file.name,
              file_url: url,
              file_size: file.size
            })
          } catch (error) {
            console.error('Error uploading file:', error)
            toast.error(`Failed to upload ${file.name}`)
          }
        }
        setUploadingFile(false)
      }
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        project_id: null,
        assigned_to: '',
        deadline: null
      })
      setCreateTaskFiles([])
      setShowCreateModal(false)
      toast.success('Task created successfully!')
      refetch()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
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

  const handleUpdateSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSubtask) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projections/subtasks/${editingSubtask.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: editingSubtask.status,
          actual_hours: editingSubtask.actual_hours
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update subtask')
      }

      toast.success('Subtask updated successfully')
      setEditingSubtask(null)
      // Refetch subtasks
      queryClient.invalidateQueries({ queryKey: ['my-subtasks'] })
    } catch (error) {
      toast.error('Failed to update subtask')
    }
  }

  const handleAddComment = async () => {
    if (!viewingTask || !newComment.trim()) return
    
    try {
      const comment = await addTaskComment.mutateAsync({ 
        taskId: viewingTask.id, 
        comment: newComment.trim() 
      }) as TaskComment
      
      // Update taskDetails state with new comment
      setTaskDetails(prev => ({
        ...prev,
        comments: [...prev.comments, comment]
      }))
      
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
      // Error toast is handled by the mutation
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!viewingTask || !e.target.files?.[0]) return
    
    const file = e.target.files[0]
    
    // Reset file input immediately for security
    const inputElement = e.target
    inputElement.value = ''
    
    setUploadingFile(true)
    
    try {
      // Upload file to Supabase storage
      toast('Uploading file...', { duration: 2000 })
      const uploadResult = await uploadTaskFile(file, viewingTask.id)
      
      // Add attachment record to database
      const attachment = await tasksApi.addAttachment(viewingTask.id, {
        file_name: file.name,
        file_url: uploadResult.url,
        file_size: file.size
      })
      
      // Update local state
      setTaskDetails(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }))
      
      toast.success(`File "${file.name}" uploaded successfully!`)
      
    } catch (error: any) {
      console.error('Upload error:', error)
      const errorMessage = error?.message || 'File upload failed'
      toast.error(`Upload failed: ${errorMessage}`)
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
      
      // Update local state
      setTaskDetails(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.id !== attachmentId)
      }))
      
      toast.success('Attachment deleted successfully!')
      
    } catch (error: any) {
      console.error('Delete attachment error:', error)
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
    setFilterDateFrom('')
    setFilterDateTo('')
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept.toLowerCase()}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignee
            </label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="input text-sm"
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
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="input text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="input text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn btn-secondary w-full text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {(filterDepartment || filterAssignee || filterStatus || filterDateFrom || filterDateTo) && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
            <div className="flex flex-wrap gap-2">
              {filterDepartment && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Department: {filterDepartment}
                  <button
                    onClick={() => setFilterDepartment('')}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterAssignee && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Assignee: {users.find(u => u.id === filterAssignee)?.full_name}
                  <button
                    onClick={() => setFilterAssignee('')}
                    className="ml-1 hover:text-green-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterStatus && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Status: {filterStatus.replace('_', ' ')}
                  <button
                    onClick={() => setFilterStatus('')}
                    className="ml-1 hover:text-purple-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {(filterDateFrom || filterDateTo) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Date: {filterDateFrom || '...'} to {filterDateTo || '...'}
                  <button
                    onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
                    className="ml-1 hover:text-yellow-900"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
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

      {/* Projection Subtasks Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            📊 {user?.role === 'admin' ? 'All Projection Subtasks' : 'Projection Subtasks Assigned to You'}
          </span>
        </h2>
        
        {subtasksLoading ? (
          <TableSkeleton />
        ) : subtasks.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">{user?.role === 'admin' ? 'No projection subtasks found' : 'No projection subtasks assigned to you'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtask
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projection
                  </th>
                  {user?.role === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours (Est / Actual)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {subtasks.map((subtask) => (
                  <tr key={subtask.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{subtask.title}</div>
                      {subtask.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{subtask.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {subtask.projection?.title || subtask.projection?.project_name || 'Untitled'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          subtask.projection?.projection_type === 'weekly' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {subtask.projection?.projection_type === 'weekly' ? '📊 Weekly' : '📅 Monthly'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {subtask.projection?.start_date && subtask.projection?.end_date 
                            ? `${new Date(subtask.projection.start_date).toLocaleDateString()} - ${new Date(subtask.projection.end_date).toLocaleDateString()}`
                            : 'No date range'
                          }
                        </span>
                      </div>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">
                            {subtask.assigned_user?.full_name || 'Unassigned'}
                          </div>
                          {subtask.assigned_user?.email && (
                            <div className="text-xs text-gray-500">{subtask.assigned_user.email}</div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">{subtask.estimated_hours || 0}h</span>
                        <span className="text-gray-400"> / </span>
                        <span className={(subtask.actual_hours || 0) > (subtask.estimated_hours || 0) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {subtask.actual_hours || 0}h
                        </span>
                      </div>
                      {(subtask.actual_hours || 0) > (subtask.estimated_hours || 0) && (
                        <div className="text-xs text-red-500 mt-1">Over estimate</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        subtask.priority === 'high' ? 'bg-red-100 text-red-800' :
                        subtask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {subtask.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        subtask.status === 'completed' ? 'bg-green-100 text-green-800' :
                        subtask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {subtask.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {subtask.deadline ? (
                        <div className="text-sm">
                          <div className={`${
                            new Date(subtask.deadline) < new Date() && subtask.status !== 'completed'
                              ? 'text-red-600 font-medium'
                              : 'text-gray-900'
                          }`}>
                            {new Date(subtask.deadline).toLocaleDateString()}
                          </div>
                          {new Date(subtask.deadline) < new Date() && subtask.status !== 'completed' && (
                            <div className="text-xs text-red-500">Overdue</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No deadline</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingSubtask(subtask)}
                          className="text-green-600 hover:text-green-900 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingSubtask(subtask)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments
                  </label>
                  <FileUpload
                    onFilesChange={setCreateTaskFiles}
                    maxFiles={5}
                    maxSizeMB={200}
                    allowVideos={true}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateTaskFiles([])
                  }}
                  className="btn btn-secondary flex-1"
                  disabled={createTask.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={createTask.isPending || uploadingFile}
                >
                  {uploadingFile ? 'Uploading...' : createTask.isPending ? 'Creating...' : 'Create'}
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
                  disabled={!newComment.trim() || addTaskComment.isPending}
                >
                  {addTaskComment.isPending 
                    ? 'Adding...' 
                    : (user?.role === 'admin' ? '✓ Add Review' : '+ Add Comment')
                  }
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

      {/* View Subtask Modal */}
      {viewingSubtask && (
        <SubtaskViewModal
          subtask={viewingSubtask}
          onClose={() => setViewingSubtask(null)}
          onEdit={(subtask) => {
            setViewingSubtask(null)
            setEditingSubtask(subtask)
          }}
        />
      )}

      {/* Edit Subtask Modal */}
      {editingSubtask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Update Subtask</h2>
            <form onSubmit={handleUpdateSubtask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtask
                  </label>
                  <div className="text-sm font-medium text-gray-900 p-2 bg-gray-50 rounded">
                    {editingSubtask.title}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={editingSubtask.status}
                    onChange={(e) => setEditingSubtask({ ...editingSubtask, status: e.target.value as TaskStatus })}
                    className="input"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actual Hours *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editingSubtask.actual_hours}
                    onChange={(e) => setEditingSubtask({ ...editingSubtask, actual_hours: parseFloat(e.target.value) || 0 })}
                    className="input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Estimated: {editingSubtask.estimated_hours || 0}h
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingSubtask(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  Update
                </button>
              </div>
            </form>
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
