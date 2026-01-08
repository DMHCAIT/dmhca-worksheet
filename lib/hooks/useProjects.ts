import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api/projects'
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
    queryFn: () => projectsApi.getProject(id.toString()),
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
      projectsApi.update(id.toString(), data),
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
    mutationFn: (id: number) => projectsApi.delete(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success('Project deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to delete project')
    },
  })
}

// Project Attachments Hooks
export function useProjectAttachments(projectId: number) {
  return useQuery({
    queryKey: ['project-attachments', projectId],
    queryFn: () => projectsApi.getAttachments(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUploadProjectAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: number; file: File }) => 
      projectsApi.uploadAttachment(projectId, file),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-attachments', projectId] })
      toast.success('File uploaded successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to upload file')
    },
  })
}

export function useDeleteProjectAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, attachmentId }: { projectId: number; attachmentId: number }) => 
      projectsApi.deleteAttachment(projectId, attachmentId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-attachments', projectId] })
      toast.success('File deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to delete file')
    },
  })
}

// Project Members Hooks
export function useProjectMembers(projectId: number) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.getMembers(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAddProjectMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: number; userId: string; role: string }) => 
      projectsApi.addMember(projectId, userId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      // Also invalidate the main projects query to update member counts
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success('Member added successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to add member')
    },
  })
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: number; memberId: number }) => 
      projectsApi.removeMember(projectId, memberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      // Also invalidate the main projects query
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success('Member removed successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to remove member')
    },
  })
}

// Get user profiles for member management
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => projectsApi.getProfiles(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
