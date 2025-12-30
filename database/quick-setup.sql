-- Simplified Production Database Setup
-- This script sets up the database with working RLS policies

-- First, ensure we have a clean profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with proper structure
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    team VARCHAR(100),
    avatar_url TEXT,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR role = 'admin');

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (role = 'admin');

-- Create other tables if they don't exist
CREATE TABLE IF NOT EXISTS public.projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    deadline DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    project_id INTEGER REFERENCES public.projects(id),
    assigned_to UUID REFERENCES public.profiles(id),
    team VARCHAR(100) NOT NULL,
    deadline DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_projections (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    planned_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,
    goals JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    team VARCHAR(100) NOT NULL,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_id INTEGER,
    related_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Simple policies for other tables
CREATE POLICY "projects_all_access" ON public.projects FOR ALL USING (true);
CREATE POLICY "tasks_all_access" ON public.tasks FOR ALL USING (true);
CREATE POLICY "work_projections_all_access" ON public.work_projections FOR ALL USING (true);
CREATE POLICY "notifications_all_access" ON public.notifications FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_team ON public.profiles(team);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;