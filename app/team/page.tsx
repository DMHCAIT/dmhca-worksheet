'use client'

import { useState, useMemo, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { useUsers, useCreateUser, useUpdateUser } from '@/lib/hooks'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CreateUserModal } from '@/components/team/CreateUserModal'
import { EditUserModal } from '@/components/team/EditUserModal'
import { UserFiltersBar, UserFilters } from '@/components/team/UserFiltersBar'
import { UserTable } from '@/components/team/UserTable'
import { PasswordChangeModal } from '@/components/team/PasswordChangeModal'
import { ConfirmDialog } from '@/components/ui/Modal'
import { CreateUserForm, User } from '@/types/enhanced'

function TeamContent() {
  const { user } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [offices, setOffices] = useState<Array<{ id: number; name: string }>>([])
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    department: '',
    status: 'all'
  })

  const { data: users = [], isLoading, error } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  // Default office locations (fallback if API fails or returns empty)
  const defaultOffices = [
    { id: 1, name: 'DMHCA Delhi Branch' },
    { id: 2, name: 'DMHCA Hyderabad Branch' },
    { id: 3, name: 'DMHCA Head Office' }
  ]

  // Fetch office locations
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const token = localStorage.getItem('authToken')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/office-locations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data && data.data.length > 0) {
            console.log('✅ Offices loaded from API:', data.data)
            setOffices(data.data)
          } else {
            console.log('⚠️ API returned empty offices, using fallback')
            setOffices(defaultOffices)
          }
        } else {
          console.log('⚠️ API request failed, using fallback offices')
          setOffices(defaultOffices)
        }
      } catch (error) {
        console.error('❌ Error fetching offices:', error)
        console.log('🔄 Using fallback office locations')
        setOffices(defaultOffices)
      }
    }
    fetchOffices()
  }, [])

  // Get unique departments from users
  const departments = useMemo(() => {
    const depts = new Set(
      users
        .map(u => u.department || u.team)
        .filter((dept): dept is string => Boolean(dept))
        .filter(d => d !== 'undefined' && d !== 'null')
    )
    return Array.from(depts).sort()
  }, [users])

  // Filter users based on current filters
  const filteredUsers = useMemo(() => {
    let result = users

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(user => 
        user.full_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.department && user.department.toLowerCase().includes(searchLower)) ||
        (user.team && user.team.toLowerCase().includes(searchLower))
      )
    }

    // Role filter
    if (filters.role !== 'all') {
      result = result.filter(user => user.role === filters.role)
    }

    // Department filter
    if (filters.department) {
      result = result.filter(user => 
        user.department === filters.department || user.team === filters.department
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      const isActiveFilter = filters.status === 'active'
      result = result.filter(user => user.is_active === isActiveFilter)
    }

    return result
  }, [users, filters])

  const handleCreateUser = async (formData: CreateUserForm) => {
    await createUser.mutateAsync(formData)
  }

  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    await updateUser.mutateAsync({ id: userId, data: userData })
    setShowEditModal(false)
    setSelectedUser(null)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUser(user)
      setShowDeleteModal(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return
    
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete user')
      }

      // Refresh users list
      window.location.reload() // TODO: Use proper state management
    } catch (error) {
      console.error('Error deleting user:', error)
      alert((error as Error).message || 'Error deleting user')
    } finally {
      setShowDeleteModal(false)
      setSelectedUser(null)
    }
  }

  const handleChangePassword = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUser(user)
      setShowPasswordModal(true)
    }
  }

  const handlePasswordSubmit = async (userId: string, newPassword: string) => {
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/change-password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword })
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to change password')
    }
  }

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    // Status toggle functionality removed - is_active field doesn't exist in database
    console.log('Status toggle disabled - is_active field not supported')
  }

  const canManageTeam = user?.role === 'admin' || user?.role === 'team_lead'

  if (error) {
    return <ErrorDisplay error={error} title="Failed to load team members" />
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600 mt-1">Manage your team and members</p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={createUser.isPending}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Team Member
          </button>
        )}
      </div>

      {/* Filters */}
      <UserFiltersBar
        onFilterChange={setFilters}
        totalUsers={users.length}
        filteredCount={filteredUsers.length}
        departments={departments}
      />

      {/* User Table */}
      <UserTable
        users={filteredUsers}
        isLoading={isLoading}
        onEditUser={canManageTeam ? handleEditUser : undefined}
        onDeleteUser={canManageTeam ? handleDeleteUser : undefined}
        onChangePassword={canManageTeam ? handleChangePassword : undefined}
        onToggleUserStatus={canManageTeam ? handleToggleUserStatus : undefined}
      />

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        offices={offices}
        isLoading={createUser.isPending}
      />

      {selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSubmit={handleUpdateUser}
          user={selectedUser}
          offices={offices}
          isLoading={updateUser.isPending}
        />
      )}

      {selectedUser && (
        <PasswordChangeModal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false)
            setSelectedUser(null)
          }}
          onSubmit={handlePasswordSubmit}
          userId={selectedUser.id}
          userName={selectedUser.full_name}
        />
      )}

      {selectedUser && (
        <ConfirmDialog
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedUser(null)
          }}
          onConfirm={handleConfirmDelete}
          title={`Delete ${selectedUser.full_name}`}
          message={`Are you sure you want to delete ${selectedUser.full_name}? This action cannot be undone.`}
          confirmLabel="Delete User"
          cancelLabel="Cancel"
          confirmVariant="danger"
        />
      )}
    </DashboardLayout>
  )
}

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <TeamContent />
      </ErrorBoundary>
    </ProtectedRoute>
  )
}

