import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import { User, CreateUserRequest, UpdateUserRequest } from '@/types'
import toast from 'react-hot-toast'

// Query keys
export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => ['users', id] as const,
}

// Get all users
export function useUsers(options?: Omit<UseQueryOptions<User[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<User[], Error>({
    queryKey: userKeys.all,
    queryFn: () => usersApi.getAll(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  })
}

// Get single user
export function useUser(id: string, options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<User, Error>({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getUser(id),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    enabled: !!id,
    ...options,
  })
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.success('User created successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to create user')
    },
  })
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => 
      usersApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) })

      const previousUser = queryClient.getQueryData<User>(userKeys.detail(id))

      if (previousUser) {
        queryClient.setQueryData<User>(userKeys.detail(id), {
          ...previousUser,
          ...data,
        } as User)
      }

      return { previousUser }
    },
    onError: (error: any, { id }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(id), context.previousUser)
      }
      toast.error(error?.error?.message || 'Failed to update user')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.success('User updated successfully!')
    },
  })
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.success('User deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || 'Failed to delete user')
    },
  })
}
