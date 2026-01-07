import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { User, UserRole } from '@/types/enhanced'
import { SelectOption } from '@/types/enhanced'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userId: string, data: Partial<User>) => Promise<void>
  user: User
  offices: Array<{ id: number; name: string }>
  isLoading?: boolean
}

const roleOptions: SelectOption<UserRole>[] = [
  { value: 'employee', label: 'Employee', description: 'Standard team member' },
  { value: 'team_lead', label: 'Team Lead', description: 'Team leader with additional permissions' },
  { value: 'manager', label: 'Manager', description: 'Department manager with oversight responsibilities' },
  { value: 'admin', label: 'Administrator', description: 'Full system access' },
]

const departments = [
  'Admin',
  'Digital Marketing',
  'Sales',
  'IT'
]

export function EditUserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  offices,
  isLoading = false
}: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    department: user.department || '',
    phone: user.phone || '',
    branch_id: user.branch_id || null,
    is_active: user.is_active
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when user changes
  useEffect(() => {
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      phone: user.phone || '',
      branch_id: user.branch_id || null,
      is_active: user.is_active
    })
  }, [user])

  // Debug logging for office data
  React.useEffect(() => {
    console.log('🏢 EditUserModal offices data:', offices)
    if (!offices || offices.length === 0) {
      console.log('⚠️ No offices available for selection')
    }
  }, [offices])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.department) {
      newErrors.department = 'Department is required'
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      // Only send fields that backend accepts
      const updateData = {
        full_name: formData.full_name,
        department: formData.department,
        role: formData.role
      }
      console.log('🔄 Updating user with data:', updateData)
      await onSubmit(user.id, updateData)
      onClose()
    } catch (error) {
      console.error('Error updating user:', error)
      // Error handling is managed by the parent component
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Use fallback offices if API data is unavailable  
  const availableOffices = offices && offices.length > 0 ? offices : [
    { id: 1, name: 'DMHCA Delhi Branch' },
    { id: 2, name: 'DMHCA Hyderabad Branch' },
    { id: 3, name: 'DMHCA Head Office' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          Edit User: {user.full_name}
        </ModalHeader>
        
        <ModalBody>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.full_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
                {errors.full_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.department ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-red-600 text-sm mt-1">{errors.department}</p>
                )}
              </div>
            </div>

            {/* Phone and Branch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={formData.branch_id || ''}
                  onChange={(e) => handleInputChange('branch_id', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No specific branch</option>
                  {availableOffices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
                {(!offices || offices.length === 0) && (
                  <p className="text-yellow-600 text-xs mt-1">
                    Using default branch options (API data unavailable)
                  </p>
                )}
              </div>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  User is active
                </span>
              </label>
            </div>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Update User
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}