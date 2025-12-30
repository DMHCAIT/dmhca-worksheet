import { z } from 'zod'

// User schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  role: z.enum(['admin', 'team_lead', 'employee']),
  department: z.string().optional(),
  phone: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  role: z.enum(['admin', 'team_lead', 'employee']),
  department: z.string().optional(),
  phone: z.string().optional(),
})

// Project schemas
export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['active', 'completed', 'on_hold']),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  creator_name: z.string().optional(),
})

export const createProjectSchema = z.object({
  name: z.string().min(3),
  description: z.string(),
  status: z.enum(['active', 'completed', 'on_hold']).optional(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(),
})

// Task schemas
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
  project_id: z.number().nullable().optional(),
  assigned_to: z.string(),
  deadline: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  project_name: z.string().optional(),
  assigned_user_name: z.string().optional(),
})

export const createTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  project_id: z.number().nullable().optional(),
  assigned_to: z.string(),
  deadline: z.string().nullable().optional(),
})

// API Response schemas
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  })

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
})

// Auth schemas
export const loginResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    full_name: z.string(),
    role: z.string(),
  }),
})

// Array response schemas
export const usersResponseSchema = apiResponseSchema(z.array(userSchema))
export const projectsResponseSchema = apiResponseSchema(z.array(projectSchema))
export const tasksResponseSchema = apiResponseSchema(z.array(taskSchema))

// Single item response schemas
export const userResponseSchema = apiResponseSchema(userSchema)
export const projectResponseSchema = apiResponseSchema(projectSchema)
export const taskResponseSchema = apiResponseSchema(taskSchema)
