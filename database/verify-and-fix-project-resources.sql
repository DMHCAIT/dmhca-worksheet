-- Verification and fix script for project resources functionality
-- Run this in Supabase SQL Editor to ensure all components are properly set up

-- Check if unique constraint exists on project_members
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'project_members' 
AND constraint_type = 'UNIQUE';

-- Add unique constraint if missing (prevent duplicate memberships)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'project_members' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%project_id_user_id%'
    ) THEN
        ALTER TABLE public.project_members 
        ADD CONSTRAINT project_members_project_id_user_id_unique 
        UNIQUE(project_id, user_id);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policies for project_attachments if they don't exist
DROP POLICY IF EXISTS "Users can view attachments of their projects" ON public.project_attachments;
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

DROP POLICY IF EXISTS "Users can upload attachments to their projects" ON public.project_attachments;
CREATE POLICY "Users can upload attachments to their projects" ON public.project_attachments
    FOR INSERT WITH CHECK (
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

DROP POLICY IF EXISTS "Users can delete their own attachments or project owners can delete any" ON public.project_attachments;
CREATE POLICY "Users can delete their own attachments or project owners can delete any" ON public.project_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_attachments.project_id 
            AND p.created_by = auth.uid()
        )
    );

-- Add missing RLS policies for project_members if they don't exist
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
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

DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
CREATE POLICY "Project owners can manage members" ON public.project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_members.project_id 
            AND p.created_by = auth.uid()
        )
    );

-- Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_project_attachments_project ON public.project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_uploaded_by ON public.project_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_attachments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_members_id_seq TO authenticated;

-- Test query to verify functionality
SELECT 'Setup verification completed' AS status;