-- Add project attachments and members support
-- Run this in Supabase SQL Editor

-- Create project_attachments table for project resources
CREATE TABLE IF NOT EXISTS public.project_attachments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_members table for project team members
CREATE TABLE IF NOT EXISTS public.project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member', 'viewer'
    added_by UUID REFERENCES public.profiles(id) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id) -- Prevent duplicate memberships
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_attachments_project ON public.project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_uploaded_by ON public.project_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

-- Enable Row Level Security
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_attachments
CREATE POLICY "Users can view attachments of their projects" ON public.project_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm 
            WHERE pm.project_id = project_attachments.project_id 
            AND pm.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_attachments.project_id 
            AND p.created_by = auth.uid()
        )
    );

CREATE POLICY "Project members can add attachments" ON public.project_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND (
            EXISTS (
                SELECT 1 FROM public.project_members pm 
                WHERE pm.project_id = project_attachments.project_id 
                AND pm.user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM public.projects p 
                WHERE p.id = project_attachments.project_id 
                AND p.created_by = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own attachments or project owners can delete any" ON public.project_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_attachments.project_id 
            AND p.created_by = auth.uid()
        )
    );

-- RLS Policies for project_members
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm2 
            WHERE pm2.project_id = project_members.project_id 
            AND pm2.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_members.project_id 
            AND p.created_by = auth.uid()
        )
    );

CREATE POLICY "Project owners and admins can manage members" ON public.project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_members.project_id 
            AND p.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm 
            WHERE pm.project_id = project_members.project_id 
            AND pm.user_id = auth.uid() 
            AND pm.role = 'admin'
        )
    );

-- Add comments to tables
COMMENT ON TABLE public.project_attachments IS 'File attachments and resources for projects';
COMMENT ON TABLE public.project_members IS 'Project team members with role-based access';
COMMENT ON COLUMN public.project_members.role IS 'Member role: admin (can manage project and members), member (can contribute), viewer (read-only)';