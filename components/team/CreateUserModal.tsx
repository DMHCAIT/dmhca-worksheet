import React, { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { CreateUserForm, User, UserRole } from '@/types/enhanced'
import { SelectOption } from '@/types/enhanced'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateUserForm) => Promise<void>
  offices: Array<{ id: number; name: string }>
  isLoading?: boolean
}

const roleOptions: SelectOption<UserRole>[] = [
  { value: 'employee', label: 'Employee', description: 'Standard team member' },
  { value: 'team_lead', label: 'Team Lead', description: 'Team leader with additional permissions' },
  { value: 'admin', label: 'Administrator', description: 'Full system access' },
]

const departments = [
  'Administration',
  'Finance', 
  'Human Resources',
  'Information Technology',
  'Medical Records',
  'Nursing',
  'Operations',
  'Quality Assurance'
]

export function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
  offices,
  isLoading = false
}: CreateUserModalProps) {
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    department: '',
    phone: '',
    branch_id: null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (field: keyof CreateUserForm, value: CreateUserForm[keyof CreateUserForm]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    } else if (formData.full_name.length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number'
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required'
    }

    if (formData.phone && !/^\+?[\d\s-()]{10,15}$/.test(formData.phone)) {
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
      await onSubmit(formData)
      // Reset form on success
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'employee',
        department: '',
        phone: '',
        branch_id: null,
      })
      setErrors({})
      onClose()
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleCancel = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'employee',
      department: '',
      phone: '',
      branch_id: null,
    })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      size="lg"
      aria-labelledby="create-user-title"
    >
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={handleCancel}>
          <h3 id="create-user-title" className="text-lg font-medium text-gray-900">
            Create New Team Member
          </h3>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="user-full-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="user-full-name"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full name..."
                aria-describedby={errors.full_name ? "full-name-error" : undefined}
              />
              {errors.full_name && (
                <p id="full-name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.full_name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="user-email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="user@example.com"
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="user-password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter secure password..."
                  aria-describedby={errors.password ? "password-error" : "password-help"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>
              {!errors.password && (
                <p id="password-help" className="mt-1 text-xs text-gray-600">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              )}
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role */}
              <div>
                <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="user-role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value as UserRole)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value} title={option.description}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="user-department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  id="user-department"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.department ? 'border-red-500' : 'border-gray-300'
                  }`}
                  aria-describedby={errors.department ? "department-error" : undefined}
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p id="department-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.department}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label htmlFor="user-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="user-phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number..."
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Branch */}
              <div>
                <label htmlFor="user-branch" className="block text-sm font-medium text-gray-700 mb-1">
                  Branch/Office
                </label>
                <select
                  id="user-branch"
                  value={formData.branch_id || ''}
                  onChange={(e) => handleChange('branch_id', e.target.value ? Number(e.target.value) : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No specific branch</option>
                  {offices.map(office => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}