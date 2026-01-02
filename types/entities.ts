// Domain entity type definitions

export type UserRole = 'admin' | 'manager' | 'team_lead' | 'employee'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectStatus = 'active' | 'completed' | 'on_hold'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string
  team?: string
  phone?: string
  branch_id?: number | null
  office_locations?: {
    id: number
    name: string
  }
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
  created_by?: string
  project_name?: string
  assigned_user_name?: string
  creator_name?: string
  team?: string
}

export interface TaskComment {
  id: number
  task_id: number
  user_id: string
  comment: string
  created_at: string
  user_name?: string
}

export interface TaskAttachment {
  id: number
  task_id: number
  file_name: string
  file_url: string
  file_size?: number
  uploaded_by: string
  created_at: string
  uploader_name?: string
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
  type: 'attendance' | 'performance' | 'project_summary' | 'team_analytics'
  content: {
    data: Record<string, unknown>
    charts?: Array<{
      type: 'bar' | 'line' | 'pie' | 'table'
      title: string
      data: unknown
    }>
    summary?: {
      total_records: number
      date_range: {
        start: string
        end: string
      }
      filters_applied: Record<string, unknown>
    }
  }
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkProjection {
  id: number
  title?: string
  week_start_date: string
  week_end_date: string
  projection_type?: 'weekly' | 'monthly'
  project_id: number
  user_id: string
  team: string
  estimated_hours: number
  actual_hours?: number
  status: string
  notes?: string
  created_at: string
  project?: { name: string }
  user?: { full_name: string }
}
