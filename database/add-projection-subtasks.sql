-- Add projection_type column to work_projections table
ALTER TABLE public.work_projections 
ADD COLUMN IF NOT EXISTS projection_type VARCHAR(20) DEFAULT 'weekly' CHECK (projection_type IN ('weekly', 'monthly'));

-- Create projection_subtasks table for breaking down work
CREATE TABLE IF NOT EXISTS public.projection_subtasks (
    id SERIAL PRIMARY KEY,
    projection_id INTEGER REFERENCES public.work_projections(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    deadline DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projection_subtasks_projection_id ON public.projection_subtasks(projection_id);
CREATE INDEX IF NOT EXISTS idx_projection_subtasks_assigned_to ON public.projection_subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projection_subtasks_status ON public.projection_subtasks(status);

-- Enable Row Level Security
ALTER TABLE public.projection_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projection_subtasks
CREATE POLICY "Users can view relevant projection subtasks" ON public.projection_subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.work_projections wp
            INNER JOIN public.profiles p ON p.id = auth.uid()
            WHERE wp.id = projection_subtasks.projection_id
            AND (
                p.role = 'admin' OR 
                (p.role = 'team_lead' AND p.team = wp.team) OR
                (p.role = 'employee' AND (p.id = wp.user_id OR p.id = projection_subtasks.assigned_to))
            )
        )
    );

CREATE POLICY "Projection owners and admins can create subtasks" ON public.projection_subtasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.work_projections wp
            INNER JOIN public.profiles p ON p.id = auth.uid()
            WHERE wp.id = projection_subtasks.projection_id
            AND (
                p.role = 'admin' OR 
                (p.role = 'team_lead' AND p.team = wp.team) OR
                p.id = wp.user_id
            )
        )
    );

CREATE POLICY "Relevant users can update subtasks" ON public.projection_subtasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.work_projections wp
            INNER JOIN public.profiles p ON p.id = auth.uid()
            WHERE wp.id = projection_subtasks.projection_id
            AND (
                p.role = 'admin' OR 
                (p.role = 'team_lead' AND p.team = wp.team) OR
                p.id = wp.user_id OR
                p.id = projection_subtasks.assigned_to
            )
        )
    );

CREATE POLICY "Projection owners and admins can delete subtasks" ON public.projection_subtasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.work_projections wp
            INNER JOIN public.profiles p ON p.id = auth.uid()
            WHERE wp.id = projection_subtasks.projection_id
            AND (
                p.role = 'admin' OR 
                (p.role = 'team_lead' AND p.team = wp.team) OR
                p.id = wp.user_id
            )
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projection_subtasks_updated_at BEFORE UPDATE
    ON public.projection_subtasks FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.projection_subtasks IS 'Sub-tasks and work breakdown for work projections';
COMMENT ON COLUMN public.work_projections.projection_type IS 'Type of projection: weekly (Mon-Sat) or monthly';
COMMENT ON COLUMN public.projection_subtasks.estimated_hours IS 'Estimated hours for this specific subtask';
COMMENT ON COLUMN public.projection_subtasks.actual_hours IS 'Actual hours spent on this subtask';
