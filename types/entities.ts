// Domain entity type definitions

export type UserRole = 'admin' | 'team_lead' | 'employee'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectStatus = 'active' | 'completed' | 'on_hold'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string
  phone?: string
  created_at?: string
  updated_at?: string
}

export interface Project {
  id: number
  name: string
  description?: string
  status?: ProjectStatus
  start_date?: string
  end_date?: string | null
  deadline?: string | null
  team?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  creator_name?: string
}

export interface Task {
  id: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  project_id?: number | null
  assigned_to: string
  deadline?: string | null
  created_at: string
  updated_at: string
  project_name?: string
  assigned_user_name?: string
}

export interface Notification {
  id: number
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface Report {
  id: number
  title: string
  type: string
  content: any
  created_by: string
  created_at: string
  updated_at: string
}
