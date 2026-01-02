import React from 'react'
import { Task, TaskPriority, TaskStatus } from '@/types/enhanced'

interface TaskTableProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  currentUserId: string
  isLoading?: boolean
}

interface TaskRowProps {
  task: Task
  onTaskClick: (task: Task) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  currentUserId: string
}

const getPriorityColor = (priority: TaskPriority): string => {
  switch (priority) {
    case 'low': return 'bg-green-100 text-green-800'
    case 'medium': return 'bg-yellow-100 text-yellow-800'
    case 'high': return 'bg-orange-100 text-orange-800'
    case 'critical': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-green-100 text-green-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const isOverdue = (deadline: string | null, status: TaskStatus): boolean => {
  if (!deadline || status === 'completed' || status === 'cancelled') return false
  return new Date(deadline) < new Date()
}

function TaskRow({ task, onTaskClick, onEditTask, onDeleteTask, currentUserId }: TaskRowProps) {
  const canEdit = currentUserId === task.creator_id || currentUserId === task.assigned_to
  const overdue = isOverdue(task.deadline, task.status)

  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer border-b border-gray-200"
      onClick={() => onTaskClick(task)}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTaskClick(task)
        }
      }}
      aria-label={`Task: ${task.title}`}
    >
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate max-w-xs" title={task.title}>
              {task.title}
            </h3>
            {overdue && (
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                title="This task is overdue"
              >
                Overdue
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate max-w-md mt-1" title={task.description}>
            {task.description}
          </p>
          {task.project && (
            <p className="text-xs text-blue-600 mt-1">
              Project: {task.project.name}
            </p>
          )}
        </div>
      </td>

      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
          {task.status.replace('_', ' ')}
        </span>
      </td>

      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </td>

      <td className="px-6 py-4">
        <div className="text-sm">
          {task.assignee ? (
            <div>
              <p className="font-medium text-gray-900">{task.assignee.full_name}</p>
              <p className="text-gray-500">{task.assignee.email}</p>
            </div>
          ) : (
            <span className="text-gray-500 italic">Unassigned</span>
          )}
        </div>
      </td>

      <td className="px-6 py-4 text-sm text-gray-900">
        <div>
          <p className={overdue ? 'text-red-600 font-medium' : ''}>
            {formatDate(task.deadline)}
          </p>
          {task.estimated_hours && (
            <p className="text-xs text-gray-500">
              Est: {task.estimated_hours}h
              {task.actual_hours && ` / Act: ${task.actual_hours}h`}
            </p>
          )}
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="text-sm">
          <p className="font-medium text-gray-900">
            {task.creator?.full_name || 'Unknown'}
          </p>
          <p className="text-gray-500">
            {formatDate(task.created_at)}
          </p>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onTaskClick(task)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={`View task: ${task.title}`}
          >
            View
          </button>
          {canEdit && (
            <>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onEditTask(task)}
                className="text-orange-600 hover:text-orange-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
                aria-label={`Edit task: ${task.title}`}
              >
                Edit
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onDeleteTask(task)}
                className="text-red-600 hover:text-red-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label={`Delete task: ${task.title}`}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

function LoadingRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </td>
      {Array.from({ length: 6 }, (_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </td>
      ))}
    </tr>
  )
}

export function TaskTable({ 
  tasks, 
  onTaskClick, 
  onEditTask, 
  onDeleteTask, 
  currentUserId,
  isLoading = false 
}: TaskTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full" role="table" aria-label="Tasks">
          <thead className="bg-gray-50">
            <tr role="row">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned to
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deadline
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created by
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 5 }, (_, i) => <LoadingRow key={i} />)}
          </tbody>
        </table>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-12 text-center">
        <svg 
          className="mx-auto h-12 w-12 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 48 48" 
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1} 
            d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.6.713-3.714m0 0A9.971 9.971 0 0124 30a9.971 9.971 0 019.287 6.286" 
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No tasks found</h3>
        <p className="mt-2 text-gray-500">
          No tasks match your current filters. Try adjusting your search criteria or create a new task.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full" role="table" aria-label="Tasks">
          <thead className="bg-gray-50">
            <tr role="row">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned to
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deadline
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created by
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                currentUserId={currentUserId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}