'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { usersApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthProvider'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  team: string
  phone?: string
  avatar_url?: string
}

interface SystemSettings {
  companyName: string
  companyLogo?: string
  timezone: string
  dateFormat: string
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyReports: boolean
  taskReminders: boolean
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('profile')
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    companyName: 'DMHCA Work Tracker',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    taskReminders: true
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    if (!user?.id) return
    
    try {
      const data = await usersApi.getUser(user.id)
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to fetch profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    try {
      await usersApi.update(profile.id, {
        full_name: profile.full_name,
        phone: profile.phone
      })
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    try {
      await usersApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      toast.success('Password changed successfully!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      toast.error('Failed to change password')
    }
  }

  const handleSystemSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // In a real app, this would call an API to update system settings
      toast.success('System settings updated successfully!')
    } catch (error) {
      toast.error('Failed to update system settings')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading settings...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and system preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setSelectedTab('profile')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedTab === 'profile' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setSelectedTab('security')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedTab === 'security' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Security
        </button>
        <button
          onClick={() => setSelectedTab('notifications')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedTab === 'notifications' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Notifications
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setSelectedTab('system')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === 'system' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            System
          </button>
        )}
      </div>

      {/* Profile Settings */}
      {selectedTab === 'profile' && profile && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={() => toast('Avatar upload feature coming soon!')}
                >
                  Change Photo
                </button>
                <p className="text-gray-500 text-sm mt-1">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email (Read Only)</label>
                <input
                  type="email"
                  className="input bg-gray-100"
                  value={profile.email}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role (Read Only)</label>
                <input
                  type="text"
                  className="input bg-gray-100"
                  value={profile.role.replace('_', ' ')}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team (Read Only)</label>
                <input
                  type="text"
                  className="input bg-gray-100"
                  value={profile.team.replace('_', ' ')}
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Update Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Settings */}
      {selectedTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary">
                  Change Password
                </button>
              </div>
            </form>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Actions</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">Demo Mode - Login/logout functionality is disabled</p>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h3>
                <p className="text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => toast.error('Account deletion is not available in demo mode')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {selectedTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
                <p className="text-gray-600">Receive email updates about your tasks and projects</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={systemSettings.emailNotifications}
                  onChange={(e) => setSystemSettings({ ...systemSettings, emailNotifications: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
                <p className="text-gray-600">Receive push notifications on your device</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={systemSettings.pushNotifications}
                  onChange={(e) => setSystemSettings({ ...systemSettings, pushNotifications: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Weekly Reports</h3>
                <p className="text-gray-600">Receive weekly performance reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={systemSettings.weeklyReports}
                  onChange={(e) => setSystemSettings({ ...systemSettings, weeklyReports: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Task Reminders</h3>
                <p className="text-gray-600">Receive reminders for upcoming task deadlines</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={systemSettings.taskReminders}
                  onChange={(e) => setSystemSettings({ ...systemSettings, taskReminders: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after-border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => toast.success('Notification preferences saved!')}
                className="btn btn-primary"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Settings (Admin Only) */}
      {selectedTab === 'system' && user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Settings</h2>
          <form onSubmit={handleSystemSettingsUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  className="input"
                  value={systemSettings.companyName}
                  onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select
                  className="input"
                  value={systemSettings.timezone}
                  onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                <select
                  className="input"
                  value={systemSettings.dateFormat}
                  onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Update System Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  )
}