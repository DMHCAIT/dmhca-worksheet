'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ProtectedRoute, useAuth } from '@/lib/auth/AuthProvider'
import { useUsers } from '@/lib/hooks'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Search, Circle } from 'lucide-react'
import { useAdaptiveQueryOptions } from '@/lib/hooks/usePerformanceOptimization'
import toast from 'react-hot-toast'

interface Message {
  id: number
  sender_id: string
  receiver_id: string
  message: string
  is_read: boolean
  created_at: string
  sender: {
    id: string
    full_name: string
    avatar_url: string
  }
  receiver: {
    id: string
    full_name: string
    avatar_url: string
  }
}

interface Conversation {
  id: string
  full_name: string
  email: string
  avatar_url: string
  role: string
  team: string
  is_online: boolean
  last_seen: string
  unread_count: number
}

function ChatContent() {
  const { user } = useAuth()
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Adaptive polling options for real-time chat (critical priority)
  const chatPollingOptions = useAdaptiveQueryOptions('critical', true)

  // Fetch all users for new conversations
  const { data: allUsers = [] } = useUsers()

  // Fetch conversations (users with existing chats) - optimized polling
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.data || []
    },
    refetchInterval: chatPollingOptions.refetchInterval,
    refetchIntervalInBackground: chatPollingOptions.refetchIntervalInBackground,
    refetchOnWindowFocus: chatPollingOptions.refetchOnWindowFocus,
    refetchOnMount: chatPollingOptions.refetchOnMount,
    staleTime: chatPollingOptions.staleTime,
  })

  // Fetch messages for selected conversation - optimized polling
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return []
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/messages/${selectedUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      return data.data || []
    },
    enabled: !!selectedUser,
    refetchInterval: chatPollingOptions.refetchInterval,
    refetchIntervalInBackground: chatPollingOptions.refetchIntervalInBackground,
    refetchOnWindowFocus: chatPollingOptions.refetchOnWindowFocus,
    refetchOnMount: chatPollingOptions.refetchOnMount,
    staleTime: chatPollingOptions.staleTime,
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver_id: selectedUser?.id,
          message: messageText
        })
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUser?.id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setNewMessage('')
    },
    onError: () => {
      toast.error('Failed to send message')
    }
  })

  // Update online status on mount and unmount
  useEffect(() => {
    const updateOnlineStatus = async (isOnline: boolean) => {
      const token = localStorage.getItem('authToken')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/status/${isOnline ? 'online' : 'offline'}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    }

    updateOnlineStatus(true)

    // Heartbeat to keep status online
    const interval = setInterval(() => {
      updateOnlineStatus(true)
    }, 30000) // Every 30 seconds

    // Set offline on page unload
    const handleBeforeUnload = () => {
      updateOnlineStatus(false)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updateOnlineStatus(false)
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser) return
    sendMessageMutation.mutate(newMessage)
  }

  // Merge conversations with all users for complete list
  const allUsersWithStatus = (allUsers || [])
    .filter(u => u.id !== user?.id) // Exclude current user
    .map(u => {
      const conv = conversations.find(c => c.id === u.id)
      return {
        ...u,
        is_online: conv?.is_online || false,
        last_seen: conv?.last_seen || null,
        unread_count: conv?.unread_count || 0
      }
    })

  const filteredUsers = allUsersWithStatus.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex gap-4">
        {/* Users List Sidebar */}
        <div className="w-80 bg-white rounded-lg shadow flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 text-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No users found
              </div>
            ) : (
              filteredUsers.map((userItem) => (
                <button
                  key={userItem.id}
                  onClick={() => setSelectedUser(userItem as Conversation)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b ${
                    selectedUser?.id === userItem.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {userItem.full_name.charAt(0).toUpperCase()}
                    </div>
                    {userItem.is_online && (
                      <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{userItem.full_name}</span>
                      {userItem.unread_count > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                          {userItem.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{userItem.role}</div>
                    {!userItem.is_online && userItem.last_seen && (
                      <div className="text-xs text-gray-400">
                        Last seen: {new Date(userItem.last_seen).toLocaleString()}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-lg shadow flex flex-col">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  {selectedUser.is_online && (
                    <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedUser.full_name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedUser.is_online ? (
                      <span className="text-green-600">● Online</span>
                    ) : (
                      `Last seen: ${new Date(selectedUser.last_seen).toLocaleString()}`
                    )}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-900 border'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="input flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="btn btn-primary px-6"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg">Select a user to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  )
}
