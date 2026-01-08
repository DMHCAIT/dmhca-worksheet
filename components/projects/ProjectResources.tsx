'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { FileUpload } from '@/components/ui/FileUpload'
import toast from 'react-hot-toast'
import { 
  Upload, 
  X, 
  Download, 
  Users, 
  UserPlus, 
  Trash2, 
  FileText,
  Shield,
  Eye,
  User
} from 'lucide-react'

interface ProjectAttachment {
  id: number
  project_id: number
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  description?: string
  uploaded_by: string
  created_at: string
  uploader?: {
    full_name: string
  }
}

interface ProjectMember {
  id: number
  project_id: number
  user_id: string
  role: 'admin' | 'member' | 'viewer'
  added_at: string
  user: {
    full_name: string
    email: string
    role: string
  }
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
  team: string
}

interface ProjectResourcesProps {
  projectId: number
  projectName: string
  isOwner: boolean
}

export function ProjectResources({ projectId, projectName, isOwner }: ProjectResourcesProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'attachments' | 'members'>('attachments')
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin' | 'viewer'>('member')
  const [loading, setLoading] = useState(false)

  // Fetch project attachments
  const fetchAttachments = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/attachments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (data.success) {
        setAttachments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }

  // Fetch project members
  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (data.success) {
        setMembers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  // Fetch all users for member selection
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (data.success) {
        setAllUsers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  useEffect(() => {
    fetchAttachments()
    fetchMembers()
    fetchUsers()
  }, [projectId])

  // Handle file upload
  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      
      for (const file of selectedFiles) {
        // Create FormData for multipart upload
        const formData = new FormData()
        formData.append('file', file)
        
        // Upload via backend API which handles both storage and database
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - let browser set it with boundary for FormData
          },
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Failed to upload file')
        }
      }

      setSelectedFiles([])
      fetchAttachments()
      toast.success('Files uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle file deletion
  const handleDeleteAttachment = async (attachment: ProjectAttachment) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/attachments/${attachment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete file')
      }
      
      fetchAttachments()
      toast.success('File deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle add member
  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Please select a user')
      return
    }

    console.log('🎯 Adding member:', { selectedUser, selectedRole, projectId })

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      console.log('📤 Sending request...')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          role: selectedRole
        })
      })

      console.log('📬 Response status:', response.status)
      const responseData = await response.json()
      console.log('📋 Response data:', responseData)

      if (!response.ok) {
        const errorMessage = responseData.error?.message || `Failed to add member (${response.status})`
        console.error('❌ Request failed:', errorMessage)
        toast.error(errorMessage)
        return
      }

      console.log('✅ Member added successfully')
      setSelectedUser('')
      setSelectedRole('member')
      setShowAddMember(false)
      fetchMembers()
      toast.success('Member added successfully')
    } catch (error) {
      console.error('❌ Add member error:', error)
      toast.error('Failed to add member: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Handle remove member
  const handleRemoveMember = async (memberId: number) => {
    try {
      const token = localStorage.getItem('authToken')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      fetchMembers()
      toast.success('Member removed successfully')
    } catch (error) {
      console.error('Remove member error:', error)
      toast.error('Failed to remove member')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />
      case 'member':
        return <User className="w-4 h-4 text-blue-500" />
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />
      default:
        return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Filter available users (exclude current members)
  const availableUsers = allUsers.filter(u => 
    !members.some(m => m.user_id === u.id) && u.id !== user?.id
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {projectName} - Resources & Team
        </h3>
        
        {/* Tabs */}
        <div className="mt-4 flex space-x-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'attachments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Resources ({attachments.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team ({members.length})
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'attachments' && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Upload Project Resources</h4>
              <FileUpload
                onFilesChange={setSelectedFiles}
                maxFiles={10}
                maxSizeMB={200}
                allowVideos={true}
              />
              
              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={handleFileUpload}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {loading ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
                  </button>
                </div>
              )}
            </div>

            {/* Attachments List */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Project Files</h4>
              {attachments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.file_size)} • 
                            Uploaded by {attachment.uploader?.full_name || 'Unknown'} • 
                            {new Date(attachment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {(isOwner || attachment.uploaded_by === user?.id) && (
                          <button
                            onClick={() => handleDeleteAttachment(attachment)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Add Member Section */}
            {isOwner && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Team Members</h4>
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="btn btn-primary btn-sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </button>
                </div>

                {showAddMember && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select User
                        </label>
                        <select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="input"
                        >
                          <option value="">Choose a user...</option>
                          {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as any)}
                          className="input"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={handleAddMember}
                          disabled={!selectedUser}
                          className="btn btn-primary"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setShowAddMember(false)}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No team members added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {member.user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.user.full_name}</p>
                        <p className="text-xs text-gray-500">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        <span className="text-sm capitalize text-gray-600">{member.role}</span>
                      </div>
                      {isOwner && member.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Remove member"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}