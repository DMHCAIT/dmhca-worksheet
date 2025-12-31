import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { tasksApi } from '@/lib/api'
import { Task, CreateTaskRequest, UpdateTaskRequest } from '@/types'
import toast from 'react-hot-toast'

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  detail: (id: number) => ['tasks', id] as const,
}

// Get all tasks
export function useTasks(options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Task[], Error>({
    queryKey: taskKeys.all,
    queryFn: () => tasksApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  })
}

// Get single task
export function useTask(id: number, options?: Omit<UseQueryOptions<Task, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Task, Error>({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.getTask(id.toString()),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    enabled: !!id,
    ...options,
  })
}

// Create task
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success('Task created successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to create task')
    },
  })
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) => 
      tasksApi.update(id.toString(), data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) })

      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id))

      if (previousTask) {
        queryClient.setQueryData<Task>(taskKeys.detail(id), {
          ...previousTask,
          ...data,
        } as Task)
      }

      return { previousTask }
    },
    onError: (error: any, { id }, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask)
      }
      toast.error(error?.error?.message || 'Failed to update task')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success('Task updated successfully!')
    },
  })
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => tasksApi.delete(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success('Task deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to delete task')
    },
  })
}
