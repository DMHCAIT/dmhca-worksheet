'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { useUsers, useCreateUser } from '@/lib/hooks'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CreateUserRequest } from '@/types'

function TeamContent() {
  const { user } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    department: '',
    phone: ''
  })

  const { data: users = [], isLoading, error, refetch } = useUsers()
  const createUser = useCreateUser()

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    await createUser.mutateAsync(newUser)
    setShowCreateModal(false)
    setNewUser({
      email: '',
      password: '',
      full_name: '',
      role: 'employee',
      department: '',
      phone: ''
    })
  }

  const canManageTeam = user?.role === 'admin' || user?.role === 'team_lead'

  if (error) {
    return <ErrorDisplay error={error} retry={refetch} title="Failed to load team members" />
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600">Manage your team and members</p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            disabled={createUser.isPending}
          >
            Add Team Member
          </button>
        )}
      </div>

      {/* Team Members Table */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-500">Add your first team member to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      member.role === 'team_lead' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {member.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.team || member.department || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && canManageTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Add Team Member</h2>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="input"
                    disabled={user?.role !== 'admin'}
                  >
                    <option value="employee">Employee</option>
                    {user?.role === 'admin' && (
                      <>
                        <option value="team_lead">Team Lead</option>
                        <option value="admin">Admin</option>
                      </>
                    )}
                  </select>
                  {user?.role !== 'admin' && (
                    <p className="text-xs text-gray-500 mt-1">Only admins can assign admin/team lead roles</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    className="input"
                  >
                    <option value="">Select department</option>
                    <option value="admin">Admin</option>
                    <option value="digital marketing">Digital Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="it">IT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                  disabled={createUser.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
