'use client'

import { useState, useEffect } from 'react'
import { ProjectionSubtask, SubtaskComment } from '@/types'
import { useSubtaskComments, useAddSubtaskComment } from '@/lib/hooks'
import { useAuth } from '@/lib/auth/AuthProvider'
import toast from 'react-hot-toast'

interface SubtaskViewModalProps {
  subtask: ProjectionSubtask
  onClose: () => void
  onEdit: (subtask: ProjectionSubtask) => void
}

export default function SubtaskViewModal({ subtask, onClose, onEdit }: SubtaskViewModalProps) {
  const { user } = useAuth()
  const [newComment, setNewComment] = useState('')

  // Fetch comments for this subtask
  const { data: comments = [], isLoading: commentsLoading } = useSubtaskComments(subtask.id)
  const addCommentMutation = useAddSubtaskComment()

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment')
      return
    }

    try {
      await addCommentMutation.mutateAsync({ 
        subtaskId: subtask.id, 
        comment: newComment.trim() 
      })
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100'
      case 'in_progress':
        return 'text-blue-700 bg-blue-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-700 bg-red-100'
      case 'medium':
        return 'text-yellow-700 bg-yellow-100'
      case 'low':
        return 'text-green-700 bg-green-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const isOverdue = subtask.deadline && 
    new Date(subtask.deadline) < new Date() && 
    subtask.status !== 'completed'

  const isOverHours = (subtask.actual_hours || 0) > (subtask.estimated_hours || 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              📋 {subtask.title}
            </h2>
            {subtask.description && (
              <p className="text-gray-600 mt-2">{subtask.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Subtask Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(subtask.status)}`}>
              {subtask.status.replace('_', ' ')}
            </span>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Priority</p>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(subtask.priority)}`}>
              {subtask.priority}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Hours Progress</p>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{subtask.estimated_hours || 0}h</span>
              <span className="text-gray-400">/</span>
              <span className={isOverHours ? 'text-red-600 font-medium' : 'text-gray-600'}>
                {subtask.actual_hours || 0}h
              </span>
            </div>
            {isOverHours && (
              <p className="text-xs text-red-500 mt-1">Over estimate</p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500">Assigned To</p>
            <div>
              <p className="font-medium text-gray-900">
                {subtask.assigned_user?.full_name || 'Unassigned'}
              </p>
              {subtask.assigned_user?.email && (
                <p className="text-xs text-gray-500">{subtask.assigned_user.email}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Deadline</p>
            {subtask.deadline ? (
              <div>
                <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {new Date(subtask.deadline).toLocaleDateString()}
                </p>
                {isOverdue && (
                  <p className="text-xs text-red-500">Overdue</p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No deadline</p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium text-gray-900">{new Date(subtask.created_at).toLocaleDateString()}</p>
            <p className="text-xs text-gray-500">{new Date(subtask.created_at).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Projection Info */}
        {subtask.projection && (
          <div className="mb-6 p-4 bg-purple-50 rounded border-l-4 border-purple-500">
            <h4 className="font-semibold text-purple-900 mb-2">📊 Part of Projection</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-purple-700 font-medium">{subtask.projection.title}</p>
                <p className="text-purple-600">{subtask.projection.project_name}</p>
              </div>
              <div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  subtask.projection.projection_type === 'weekly' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {subtask.projection.projection_type === 'weekly' ? '📊 Weekly' : '📅 Monthly'}
                </span>
                <p className="text-xs text-purple-600 mt-1">
                  {new Date(subtask.projection.start_date).toLocaleDateString()} - {new Date(subtask.projection.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            💬 Comments & Discussion
            <span className="text-sm text-gray-500 font-normal">({comments.length})</span>
          </h3>
          
          {/* Add Comment Form */}
          <div className="mb-4 bg-gray-50 p-4 rounded">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share progress updates, questions, or notes about this subtask..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {newComment.length}/500 characters
              </span>
              <button
                onClick={handleAddComment}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                disabled={!newComment.trim() || addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? 'Adding...' : '+ Add Comment'}
              </button>
            </div>
          </div>

          {/* Comments List */}
          {commentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">Loading comments...</div>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-4 rounded border-l-4 border-blue-500">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {comment.user?.full_name || 'Unknown User'}
                      </p>
                      {comment.user_id === subtask.assigned_to && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Assignee
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {comment.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded">
              <div className="text-gray-400 text-4xl mb-2">💬</div>
              <p className="text-gray-500 text-sm">No comments yet</p>
              <p className="text-gray-400 text-xs">Be the first to add a comment!</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={() => onEdit(subtask)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex-1"
          >
            Edit Subtask
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 flex-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}