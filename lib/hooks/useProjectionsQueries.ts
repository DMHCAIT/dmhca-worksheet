import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectionsApi } from '@/lib/api'
import toast from 'react-hot-toast'

export const QUERY_KEYS = {
  projections: ['projections'],
  projection: (id: number) => ['projections', id],
}

// Fetch all projections
export function useProjections() {
  return useQuery({
    queryKey: QUERY_KEYS.projections,
    queryFn: () => projectionsApi.getAll(),
  })
}

// Create projection mutation
export function useCreateProjection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => projectionsApi.createProjection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projections })
      toast.success('Work projection created successfully!')
    },
    onError: () => {
      toast.error('Failed to create work projection')
    },
  })
}

// Update projection mutation
export function useUpdateProjection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      projectionsApi.updateProjection(id as any, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projections })
      toast.success('Projection updated successfully!')
    },
    onError: () => {
      toast.error('Failed to update projection')
    },
  })
}

// Update actual hours with optimistic update
export function useUpdateActualHours() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, hours }: { id: number; hours: number }) => 
      projectionsApi.updateProjection(id as any, { actual_hours: hours }),
    onMutate: async ({ id, hours }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.projections })

      // Snapshot the previous value
      const previousProjections = queryClient.getQueryData(QUERY_KEYS.projections)

      // Optimistically update to the new value
      queryClient.setQueryData(QUERY_KEYS.projections, (old: any) => {
        if (!old) return old
        return old.map((projection: any) => 
          projection.id === id 
            ? { ...projection, actual_hours: hours }
            : projection
        )
      })

      return { previousProjections }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProjections) {
        queryClient.setQueryData(QUERY_KEYS.projections, context.previousProjections)
      }
      toast.error('Failed to update actual hours')
    },
    onSuccess: () => {
      toast.success('Actual hours updated!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projections })
    },
  })
}

// Delete projection mutation
export function useDeleteProjection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => projectionsApi.deleteProjection(id as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projections })
      toast.success('Projection deleted successfully!')
    },
    onError: () => {
      toast.error('Failed to delete projection')
    },
  })
}
