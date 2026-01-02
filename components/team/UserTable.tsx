import React, { useState } from 'react'
import { User, UserRole } from '@/types/enhanced'

interface UserTableProps {
  users: User[]
  isLoading?: boolean
  onEditUser?: (user: User) => void
  onDeleteUser?: (userId: string) => void
  onChangePassword?: (userId: string) => void
  onToggleUserStatus?: (userId: string, isActive: boolean) => void
}

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  team_lead: 'bg-blue-100 text-blue-800',
  employee: 'bg-green-100 text-green-800',
} as const

const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return 'N/A'
  
  // Basic phone number formatting
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

const formatDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString))
  } catch {
    return 'Invalid date'
  }
}

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const colorClass = roleColors[role] || 'bg-gray-100 text-gray-800'
  const roleLabel = role === 'team_lead' ? 'Team Lead' : role.charAt(0).toUpperCase() + role.slice(1)
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {roleLabel}
    </span>
  )
}

const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <span 
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isActive 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}
  >
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

export function UserTable({
  users,
  isLoading = false,
  onEditUser,
  onDeleteUser,
  onChangePassword,
  onToggleUserStatus
}: UserTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRowExpanded = (userId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedRows(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/6"></div>
                <div className="h-4 bg-gray-300 rounded w-1/6"></div>
                <div className="h-4 bg-gray-300 rounded w-1/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Found</h3>
        <p className="text-gray-600 mb-4">
          No users match your current search criteria. Try adjusting your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" role="table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Details
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role & Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Info
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const isExpanded = expandedRows.has(user.id)
              
              return (
                <React.Fragment key={user.id}>
                  <tr className="hover:bg-gray-50">
                    {/* User Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Department */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <RoleBadge role={user.role} />
                        <span className="text-xs text-gray-600">
                          {user.department || 'No department'}
                        </span>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPhoneNumber(user.phone)}
                      </div>
                      {user.branch_name && (
                        <div className="text-xs text-gray-500">
                          {user.branch_name}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge isActive={user.is_active} />
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleRowExpanded(user.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={isExpanded ? 'Collapse user details' : 'Expand user details'}
                        >
                          <svg 
                            className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Edit Button */}
                        {onEditUser && (
                          <button
                            onClick={() => onEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            aria-label={`Edit ${user.full_name}`}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {/* Password Button */}
                        {onChangePassword && (
                          <button
                            onClick={() => onChangePassword(user.id)}
                            className="text-yellow-600 hover:text-yellow-900 transition-colors"
                            aria-label={`Change password for ${user.full_name}`}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                        )}

                        {/* Status Toggle Button */}
                        {onToggleUserStatus && (
                          <button
                            onClick={() => onToggleUserStatus(user.id, !user.is_active)}
                            className={`transition-colors ${
                              user.is_active 
                                ? 'text-orange-600 hover:text-orange-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            aria-label={user.is_active ? `Deactivate ${user.full_name}` : `Activate ${user.full_name}`}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {user.is_active ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                          </button>
                        )}

                        {/* Delete Button */}
                        {onDeleteUser && (
                          <button
                            onClick={() => onDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            aria-label={`Delete ${user.full_name}`}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Details */}
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                            <dl className="space-y-1">
                              <div>
                                <dt className="text-gray-600">User ID:</dt>
                                <dd className="font-mono text-xs">{user.id}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-600">Email:</dt>
                                <dd>{user.email}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-600">Created:</dt>
                                <dd>{new Date(user.created_at).toLocaleString()}</dd>
                              </div>
                              {user.last_login && (
                                <div>
                                  <dt className="text-gray-600">Last Login:</dt>
                                  <dd>{new Date(user.last_login).toLocaleString()}</dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Work Information</h4>
                            <dl className="space-y-1">
                              <div>
                                <dt className="text-gray-600">Role:</dt>
                                <dd className="capitalize">{user.role.replace('_', ' ')}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-600">Department:</dt>
                                <dd>{user.department || 'Not assigned'}</dd>
                              </div>
                              {user.branch_name && (
                                <div>
                                  <dt className="text-gray-600">Branch:</dt>
                                  <dd>{user.branch_name}</dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Contact Details</h4>
                            <dl className="space-y-1">
                              <div>
                                <dt className="text-gray-600">Phone:</dt>
                                <dd>{formatPhoneNumber(user.phone)}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-600">Status:</dt>
                                <dd>
                                  <StatusBadge isActive={user.is_active} />
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}