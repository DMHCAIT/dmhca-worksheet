import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'
import { Project, CreateProjectRequest, UpdateProjectRequest } from '@/types'
import toast from 'react-hot-toast'

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: number) => ['projects', id] as const,
}

// Get all projects
export function useProjects(options?: Omit<UseQueryOptions<Project[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Project[], Error>({
    queryKey: projectKeys.all,
    queryFn: () => projectsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  })
}

// Get single project
export function useProject(id: number, options?: Omit<UseQueryOptions<Project, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Project, Error>({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    enabled: !!id, // Only run if ID exists
    ...options,
  })
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success('Project created successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to create project')
    },
  })
}

// Update project
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) => 
      projectsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) })

      // Snapshot previous value
      const previousProject = queryClient.getQueryData<Project>(projectKeys.detail(id))

      // Optimistically update
      if (previousProject) {
        queryClient.setQueryData<Project>(projectKeys.detail(id), {
          ...previousProject,
          ...data,
        } as Project)
      }

      return { previousProject }
    },
    onError: (error: any, { id }, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), context.previousProject)
      }
      toast.error(error?.error?.message || 'Failed to update project')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success('Project updated successfully!')
    },
  })
}

// Delete project
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success('Project deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to delete project')
    },
  })
}
