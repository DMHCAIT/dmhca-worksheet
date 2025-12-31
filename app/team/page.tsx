'use client'

import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { useUsers, useCreateUser, useUpdateUser } from '@/lib/hooks'
import { TableSkeleton } from '@/components/LoadingSkeleton'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CreateUserRequest, User } from '@/types'
import { Edit2 } from 'lucide-react'

function TeamContent() {
  const { user } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    department: '',
    phone: ''
  })
  const [editUser, setEditUser] = useState({
    full_name: '',
    role: 'employee',
    department: '',
    phone: ''
  })

  const { data: users = [], isLoading, error } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  // Get unique departments from users
  const departments = useMemo(() => {
    const depts = new Set(
      users
        .map(u => u.department || u.team)
        .filter(Boolean)
        .filter(d => d !== 'undefined' && d !== 'null')
    )
    return Array.from(depts).sort()
  }, [users])

  // Filter users by department
  const filteredUsers = useMemo(() => {
    if (!filterDepartment) return users
    return users.filter(u => {
      const userDept = u.department || u.team
      return userDept === filterDepartment
    })
  }, [users, filterDepartment])

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

  const handleEditClick = (member: User) => {
    setEditingUser(member)
    setEditUser({
      full_name: member.full_name,
      role: member.role,
      department: member.department || member.team || '',
      phone: member.phone || ''
    })
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    
    await updateUser.mutateAsync({
      id: editingUser.id,
      data: {
        full_name: editUser.full_name,
        role: editUser.role,
        department: editUser.department,
        phone: editUser.phone
      }
    })
    setEditingUser(null)
  }

  const canManageTeam = user?.role === 'admin' || user?.role === 'team_lead'

  if (error) {
    return <ErrorDisplay error={error} retry={refetch} title="Failed to load team members" />
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
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

      {/* Department Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Department:
          </label>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="input w-64"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          {filterDepartment && (
            <button
              onClick={() => setFilterDepartment('')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear Filter
            </button>
          )}
          <div className="ml-auto text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} members
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filterDepartment ? 'No team members found in this department' : 'No team members found'}
          </h3>
          <p className="text-gray-500">
            {filterDepartment ? 'Try selecting a different department.' : 'Add your first team member to get started.'}
          </p>
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
                {canManageTeam && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredUsers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {(member as any).department || member.team || 'Not Assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  {canManageTeam && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEditClick(member)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  )}
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

      {/* Edit User Modal */}
      {editingUser && canManageTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Edit Team Member</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUser.full_name}
                    onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="input bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}
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
                    <p className="text-xs text-gray-500 mt-1">Only admins can change roles</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={editUser.department}
                    onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                    className="input"
                  >
                    <option value="">Select department</option>
                    <option value="Management">Management</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editUser.phone}
                    onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary flex-1"
                  disabled={updateUser.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? 'Updating...' : 'Update Member'}
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
