import React, { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'

interface PasswordChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userId: string, newPassword: string) => Promise<void>
  userId: string
  userName: string
  isLoading?: boolean
}

interface PasswordForm {
  password: string
  confirmPassword: string
}

export function PasswordChangeModal({
  isOpen,
  onClose,
  onSubmit,
  userId,
  userName,
  isLoading = false
}: PasswordChangeModalProps) {
  const [formData, setFormData] = useState<PasswordForm>({
    password: '',
    confirmPassword: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      await onSubmit(userId, formData.password)
      handleCancel()
    } catch (error) {
      console.error('Error changing password:', error)
    }
  }

  const handleCancel = () => {
    setFormData({ password: '', confirmPassword: '' })
    setErrors({})
    onClose()
  }

  const handleChange = (field: keyof PasswordForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0
    
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

    if (score <= 1) return { score, label: 'Very Weak', color: 'bg-red-500' }
    if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500' }
    if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' }
    if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' }
    return { score, label: 'Strong', color: 'bg-green-500' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      size="md"
      aria-labelledby="password-change-title"
    >
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={handleCancel}>
          <h3 id="password-change-title" className="text-lg font-medium text-gray-900">
            Change Password for {userName}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Set a new password for this user account
          </p>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  id="new-password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter new password..."
                  aria-describedby={errors.password ? "password-error" : "password-help"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPasswords(!showPasswords)}
                  aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                >
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPasswords ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}

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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                id="confirm-password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm new password..."
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Security Notice</p>
                  <p className="mt-1">
                    The user will be required to log in with this new password. 
                    Consider sharing this password securely with the user.
                  </p>
                </div>
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
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}