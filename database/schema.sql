-- Work Tracker Database Schema
-- Copy and paste this entire file into Supabase SQL Editor and run it

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    team VARCHAR(100),
    avatar_url TEXT,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
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

-- Create tasks table
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

-- Create work_projections table
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

-- Create time_logs table
CREATE TABLE IF NOT EXISTS public.time_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES public.tasks(id),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    hours_logged DECIMAL(5,2) NOT NULL,
    description TEXT,
    date_logged DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES public.tasks(id) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES public.tasks(id) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_team ON public.profiles(team);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON public.tasks(team);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON public.time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON public.time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_work_projections_user_id ON public.work_projections(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their team or all if admin" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR team = projects.team)
        )
    );

CREATE POLICY "Admin and team leads can create projects" ON public.projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'team_lead')
        )
    );

-- RLS Policies for tasks
CREATE POLICY "Users can view relevant tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'admin' OR 
                (role = 'team_lead' AND team = tasks.team) OR
                (role = 'employee' AND id = tasks.assigned_to)
            )
        )
    );

CREATE POLICY "Admin and team leads can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'team_lead')
        )
    );

CREATE POLICY "Users can update tasks assigned to them or manage team tasks" ON public.tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'admin' OR 
                (role = 'team_lead' AND team = tasks.team) OR
                (role = 'employee' AND id = tasks.assigned_to)
            )
        )
    );

-- RLS Policies for work_projections
CREATE POLICY "Users can view relevant projections" ON public.work_projections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'admin' OR 
                (role = 'team_lead' AND team = work_projections.team) OR
                (role = 'employee' AND id = work_projections.user_id)
            )
        )
    );

CREATE POLICY "Users can create their own projections" ON public.work_projections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projections" ON public.work_projections
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for time_logs
CREATE POLICY "Users can view relevant time logs" ON public.time_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'admin' OR 
                id = time_logs.user_id OR
                (role = 'team_lead' AND team = (
                    SELECT team FROM public.profiles WHERE id = time_logs.user_id
                ))
            )
        )
    );

CREATE POLICY "Users can create their own time logs" ON public.time_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on relevant tasks" ON public.task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE t.id = task_comments.task_id
            AND (
                p.role = 'admin' OR
                (p.role = 'team_lead' AND p.team = t.team) OR
                (p.role = 'employee' AND p.id = t.assigned_to)
            )
        )
    );

CREATE POLICY "Users can create comments on relevant tasks" ON public.task_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE t.id = task_comments.task_id
            AND (
                p.role = 'admin' OR
                (p.role = 'team_lead' AND p.team = t.team) OR
                (p.role = 'employee' AND p.id = t.assigned_to)
            )
        )
    );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_projections_updated_at BEFORE UPDATE ON public.work_projections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: After running this schema, create your admin user in Supabase Auth
-- Then update the profiles table with the correct UUID from auth.users
--
-- Steps to create admin user:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add User" and create admin@company.com
-- 3. Copy the UUID from the created user
-- 4. Run this SQL to update the profile:
--    UPDATE public.profiles SET role = 'admin', team = 'admin' 
--    WHERE id = 'paste-actual-uuid-here';