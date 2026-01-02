// Enhanced type definitions with strict typing

export type UserRole = 'admin' | 'team_lead' | 'employee'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day'

// Base entities with strict typing
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department: string
  phone?: string
  branch_id?: number
  branch_name?: string
  team?: string // Legacy field support
  is_active: boolean
  last_login?: string
  office?: OfficeLocation
  created_at: string
  updated_at: string
}

export interface OfficeLocation {
  id: number
  name: string
  address: string
  cycle_type: 'calendar' | 'custom'
  cycle_start_day: number
  working_hours_start: string // Format: "HH:MM"
  working_hours_end: string   // Format: "HH:MM"
  timezone: string
  created_at: string
}

export interface Project {
  id: number
  name: string
  description: string
  status: ProjectStatus
  start_date: string
  end_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  creator?: Pick<User, 'id' | 'full_name' | 'email'>
  team_members?: ProjectMember[]
  tasks_count?: number
}

export interface ProjectMember {
  user_id: string
  project_id: number
  role: 'manager' | 'member' | 'observer'
  joined_at: string
  user: Pick<User, 'id' | 'full_name' | 'email' | 'department'>
}

export interface Task {
  id: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  project_id: number | null
  assigned_to: string | null
  creator_id: string
  deadline: string | null
  estimated_hours?: number
  actual_hours?: number
  created_at: string
  updated_at: string
  project?: Pick<Project, 'id' | 'name'>
  creator?: Pick<User, 'id' | 'full_name' | 'email'>
  assignee?: Pick<User, 'id' | 'full_name' | 'email'>
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
}

export interface TaskComment {
  id: number
  task_id: number
  user_id: string
  content: string
  created_at: string
  user: Pick<User, 'id' | 'full_name' | 'email'>
}

export interface TaskAttachment {
  id: number
  task_id: number
  filename: string
  file_path: string
  file_size: number
  content_type: string
  uploaded_by: string
  created_at: string
  uploader?: Pick<User, 'id' | 'full_name' | 'email'>
}

export interface Projection {
  id: number
  title: string
  description: string
  project_name: string
  start_date: string
  end_date: string
  projection_type: 'weekly' | 'monthly' | 'quarterly'
  total_estimated_hours: number
  total_actual_hours: number
  created_by: string
  created_at: string
  updated_at: string
  creator?: Pick<User, 'id' | 'full_name' | 'email'>
  subtasks?: ProjectionSubtask[]
  progress_percentage?: number
}

export interface ProjectionSubtask {
  id: number
  projection_id: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string
  estimated_hours: number
  actual_hours: number
  deadline: string
  created_at: string
  updated_at: string
  projection?: Pick<Projection, 'id' | 'title' | 'project_name'>
  assigned_user?: Pick<User, 'id' | 'full_name' | 'email'>
}

export interface AttendanceRecord {
  id: number
  user_id: string
  date: string
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  working_hours: number
  is_late: boolean
  notes?: string
  created_at: string
  updated_at: string
  user?: Pick<User, 'id' | 'full_name' | 'email' | 'department'>
}

export interface LiveAttendance extends Omit<AttendanceRecord, 'check_out_time' | 'working_hours'> {
  current_status: 'checked_in' | 'checked_out' | 'not_arrived'
  hours_worked_today: number
  is_within_working_hours: boolean
}

// Form data interfaces with validation
export interface CreateTaskForm {
  title: string
  description: string
  status?: TaskStatus
  priority?: TaskPriority
  project_id?: number | null
  assigned_to?: string
  deadline?: string | null
  estimated_hours?: number
}

export interface UpdateTaskForm extends Partial<CreateTaskForm> {
  actual_hours?: number
}

export interface CreateProjectForm {
  name: string
  description: string
  status?: ProjectStatus
  start_date: string
  end_date?: string | null
}

export interface UpdateProjectForm extends Partial<CreateProjectForm> {}

export interface CreateUserForm {
  email: string
  password: string
  full_name: string
  role: UserRole
  department: string
  phone?: string
  branch_id?: number | null
}
export interface UpdateUserRequest {
  full_name?: string
  role?: UserRole
  department?: string
  phone?: string
  branch_id?: number
  is_active?: boolean
}
export interface UpdateUserForm extends Partial<Omit<CreateUserForm, 'password'>> {
  new_password?: string
}

// Filter and pagination interfaces
export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface TaskFilters extends PaginationParams {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  project_id?: number
  department?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface AttendanceFilters extends PaginationParams {
  user_id?: string
  department?: string
  branch_id?: number
  status?: AttendanceStatus
  date_from?: string
  date_to?: string
}

export interface ProjectFilters extends PaginationParams {
  status?: ProjectStatus
  created_by?: string
  search?: string
}

// Analytics and reporting interfaces
export interface TaskAnalytics {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  overdue_tasks: number
  average_completion_time: number
  tasks_by_priority: Record<TaskPriority, number>
  tasks_by_department: Record<string, number>
}

export interface AttendanceAnalytics {
  total_employees: number
  present_today: number
  absent_today: number
  late_arrivals: number
  average_working_hours: number
  on_time_percentage: number
  department_attendance: Record<string, {
    present: number
    total: number
    percentage: number
  }>
}

export interface ProjectAnalytics {
  total_projects: number
  active_projects: number
  completed_projects: number
  overdue_projects: number
  average_project_duration: number
  projects_by_department: Record<string, number>
  team_productivity: Record<string, {
    tasks_completed: number
    hours_logged: number
    efficiency_score: number
  }>
}

// Utility types for better type safety
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Event handlers with proper typing
export interface FormHandlers<T> {
  onChange: (field: keyof T, value: T[keyof T]) => void
  onSubmit: (data: T) => Promise<void> | void
  onCancel: () => void
  onReset: () => void
}

export interface TableHandlers<T> {
  onSort: (field: keyof T, direction: 'asc' | 'desc') => void
  onFilter: (filters: Partial<T>) => void
  onSelect: (items: T[]) => void
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  onView: (item: T) => void
}

// Component prop interfaces
export interface BaseComponentProps {
  className?: string
  'data-testid'?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

export interface LoadingState {
  isLoading: boolean
  error?: Error | null
  retry?: () => void
}

export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
  description?: string
}

// File upload interfaces
export interface FileUploadConfig {
  maxSize: number // bytes
  allowedTypes: string[]
  multiple?: boolean
  compress?: boolean
  maxWidth?: number
  maxHeight?: number
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploaded_at: string
  uploader_id: string
}

// Notification system
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'secondary'
  }>
}

// Real-time updates
export interface WebSocketMessage<T = unknown> {
  type: string
  payload: T
  timestamp: string
  user_id?: string
}

export interface TaskUpdateMessage {
  task_id: number
  action: 'created' | 'updated' | 'deleted'
  data: Partial<Task>
  updated_by: string
}

export interface AttendanceUpdateMessage {
  user_id: string
  action: 'check_in' | 'check_out' | 'status_change'
  data: Partial<AttendanceRecord>
  timestamp: string
}