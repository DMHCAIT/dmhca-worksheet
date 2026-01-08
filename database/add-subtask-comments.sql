-- Add projection_subtask_comments table for subtask commenting feature

-- Create projection_subtask_comments table
CREATE TABLE IF NOT EXISTS public.projection_subtask_comments (
    id SERIAL PRIMARY KEY,
    subtask_id INTEGER REFERENCES public.projection_subtasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtask_comments_subtask_id ON public.projection_subtask_comments(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_comments_user_id ON public.projection_subtask_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_subtask_comments_created_at ON public.projection_subtask_comments(created_at);

-- Enable RLS
ALTER TABLE public.projection_subtask_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant subtask comments" ON public.projection_subtask_comments;
DROP POLICY IF EXISTS "Users can create subtask comments" ON public.projection_subtask_comments;
DROP POLICY IF EXISTS "Users can update their own subtask comments" ON public.projection_subtask_comments;
DROP POLICY IF EXISTS "Users can delete their own subtask comments" ON public.projection_subtask_comments;

-- RLS Policies for projection_subtask_comments
CREATE POLICY "Users can view relevant subtask comments" ON public.projection_subtask_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projection_subtasks ps
            JOIN public.work_projections wp ON ps.projection_id = wp.id
            WHERE ps.id = projection_subtask_comments.subtask_id
            AND (
                auth.uid() = ps.assigned_to OR
                auth.uid() = ps.created_by OR
                auth.uid() = wp.user_id OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'team_lead')
                )
            )
        )
    );

CREATE POLICY "Users can create subtask comments" ON public.projection_subtask_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.projection_subtasks ps
            JOIN public.work_projections wp ON ps.projection_id = wp.id
            WHERE ps.id = subtask_id
            AND (
                auth.uid() = ps.assigned_to OR
                auth.uid() = ps.created_by OR
                auth.uid() = wp.user_id OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'team_lead')
                )
            )
        )
    );

CREATE POLICY "Users can update their own subtask comments" ON public.projection_subtask_comments
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Users can delete their own subtask comments" ON public.projection_subtask_comments
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.projection_subtask_comments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.projection_subtask_comments_id_seq TO authenticated;