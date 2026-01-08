import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subtasksApi } from '@/lib/api/subtasks'
import { ProjectionSubtask, SubtaskComment } from '@/types'
import toast from 'react-hot-toast'

// Get subtasks assigned to current user
export function useMySubtasks() {
  return useQuery<ProjectionSubtask[]>({
    queryKey: ['my-subtasks'],
    queryFn: () => subtasksApi.getMySubtasks(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get subtasks for a specific projection
export function useProjectionSubtasks(projectionId: number) {
  return useQuery<ProjectionSubtask[]>({
    queryKey: ['projection-subtasks', projectionId],
    queryFn: () => subtasksApi.getByProjectionId(projectionId),
    enabled: !!projectionId,
    staleTime: 5 * 60 * 1000,
  })
}

// Update subtask
export function useUpdateSubtask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { 
      id: number, 
      data: {
        title?: string
        description?: string
        assigned_to?: string
        estimated_hours?: number
        actual_hours?: number
        status?: string
        priority?: string
        deadline?: string
      }
    }) => subtasksApi.update(id, data),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['my-subtasks'] })
      queryClient.invalidateQueries({ queryKey: ['projection-subtasks'] })
      toast.success('Subtask updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subtask')
    },
  })
}

// Delete subtask
export function useDeleteSubtask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => subtasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subtasks'] })
      queryClient.invalidateQueries({ queryKey: ['projection-subtasks'] })
      toast.success('Subtask deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete subtask')
    },
  })
}

// Get subtask comments
export function useSubtaskComments(subtaskId: number) {
  return useQuery<SubtaskComment[]>({
    queryKey: ['subtask-comments', subtaskId],
    queryFn: () => subtasksApi.getComments(subtaskId),
    enabled: !!subtaskId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Add subtask comment
export function useAddSubtaskComment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ subtaskId, comment }: { subtaskId: number, comment: string }) => 
      subtasksApi.addComment(subtaskId, comment),
    onSuccess: (_, { subtaskId }) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-comments', subtaskId] })
      toast.success('Comment added successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment')
    },
  })
}

// Update subtask comment
export function useUpdateSubtaskComment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ subtaskId, commentId, comment }: { 
      subtaskId: number, 
      commentId: number, 
      comment: string 
    }) => subtasksApi.updateComment(subtaskId, commentId, comment),
    onSuccess: (_, { subtaskId }) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-comments', subtaskId] })
      toast.success('Comment updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update comment')
    },
  })
}

// Delete subtask comment
export function useDeleteSubtaskComment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ subtaskId, commentId }: { subtaskId: number, commentId: number }) => 
      subtasksApi.deleteComment(subtaskId, commentId),
    onSuccess: (_, { subtaskId }) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-comments', subtaskId] })
      toast.success('Comment deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete comment')
    },
  })
}