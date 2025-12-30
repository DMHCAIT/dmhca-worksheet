'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { usersApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'
import toast from 'react-hot-toast'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  team: string
  phone?: string
  created_at: string
}

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee',
    team: '',
    phone: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll()
      // API returns {users: [...]} so extract the users array
      setUsers(data.users || data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch team members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await usersApi.create(newUser)
      toast.success('Team member added successfully!')
      setShowCreateModal(false)
      setNewUser({
        full_name: '',
        email: '',
        password: '',
        role: 'employee',
        team: '',
        phone: ''
      })
      fetchUsers()
    } catch (error) {
      toast.error('Failed to add team member')
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    
    try {
      await usersApi.update(selectedUser.id, {
        full_name: selectedUser.full_name,
        role: selectedUser.role,
        team: selectedUser.team,
        phone: selectedUser.phone
      })
      toast.success('Team member updated successfully!')
      setShowEditModal(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update team member')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return
    
    try {
      await usersApi.delete(userId)
      toast.success('Team member deleted successfully!')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete team member')
    }
  }

  const canManageTeam = user && user.role === 'admin'

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'team_lead': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'digital_marketing': return 'bg-orange-100 text-orange-800'
      case 'sales': return 'bg-green-100 text-green-800'
      case 'it': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading team members...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">Manage your team members and their roles</p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Add Team Member
          </button>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Members</h3>
          <p className="text-3xl font-bold text-primary-600">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Admins</h3>
          <p className="text-3xl font-bold text-red-600">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Team Leads</h3>
          <p className="text-3xl font-bold text-blue-600">
            {users.filter(u => u.role === 'team_lead').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Employees</h3>
          <p className="text-3xl font-bold text-green-600">
            {users.filter(u => u.role === 'employee').length}
          </p>
        </div>
      </div>

      {/* Team Members List */}
      <div className="grid gap-6">
        {users.map((member) => (
          <div key={member.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{member.full_name}</h3>
                  <p className="text-gray-600">{member.email}</p>
                  {member.phone && (
                    <p className="text-gray-500 text-sm">{member.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex space-x-2 mb-2">
                    <span className={`px-3 py-1 text-sm rounded-full ${getRoleColor(member.role)}`}>
                      {member.role.replace('_', ' ')}
                    </span>
                    <span className={`px-3 py-1 text-sm rounded-full ${getTeamColor(member.team)}`}>
                      {member.team.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">
                    Joined: {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
                {canManageTeam && member.id !== user?.id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(member)
                        setShowEditModal(true)
                      }}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(member.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Team Member</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        required
                        className="input mt-1"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        required
                        className="input mt-1"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="input mt-1"
                        placeholder="Minimum 6 characters"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        className="input mt-1"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                          className="input mt-1"
                          value={newUser.role}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        >
                          <option value="employee">Employee</option>
                          <option value="team_lead">Team Lead</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Team</label>
                        <select
                          required
                          className="input mt-1"
                          value={newUser.team}
                          onChange={(e) => setNewUser({ ...newUser, team: e.target.value })}
                        >
                          <option value="">Select Team</option>
                          <option value="admin">Admin Team</option>
                          <option value="digital_marketing">Digital Marketing</option>
                          <option value="sales">Sales Team</option>
                          <option value="it">IT Team</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary sm:ml-3">
                    Add Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpdateUser}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Team Member</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        required
                        className="input mt-1"
                        value={selectedUser.full_name}
                        onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email (Read Only)</label>
                      <input
                        type="email"
                        disabled
                        className="input mt-1 bg-gray-100"
                        value={selectedUser.email}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        className="input mt-1"
                        value={selectedUser.phone || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                          className="input mt-1"
                          value={selectedUser.role}
                          onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                        >
                          <option value="employee">Employee</option>
                          <option value="team_lead">Team Lead</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Team</label>
                        <select
                          required
                          className="input mt-1"
                          value={selectedUser.team}
                          onChange={(e) => setSelectedUser({ ...selectedUser, team: e.target.value })}
                        >
                          <option value="admin">Admin Team</option>
                          <option value="digital_marketing">Digital Marketing</option>
                          <option value="sales">Sales Team</option>
                          <option value="it">IT Team</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary sm:ml-3">
                    Update Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}