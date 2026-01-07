-- Daily Work Logs System
-- This table stores daily work updates from employees

CREATE TABLE IF NOT EXISTS public.daily_work_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    work_description TEXT NOT NULL,
    tasks_completed TEXT[], -- Array of task titles/IDs completed
    hours_worked DECIMAL(5,2) DEFAULT 0,
    challenges TEXT,
    achievements TEXT,
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, log_date) -- One log per user per day
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_user_date ON public.daily_work_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_date ON public.daily_work_logs(log_date DESC);

-- Enable Row Level Security
ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;

-- Policies for daily_work_logs
-- Employees can view and create their own logs
CREATE POLICY "Users can view their own work logs"
    ON public.daily_work_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own work logs"
    ON public.daily_work_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work logs"
    ON public.daily_work_logs FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins and team leads can view all logs in their scope
CREATE POLICY "Admins can view all work logs"
    ON public.daily_work_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Team leads can view their team's work logs"
    ON public.daily_work_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p1
            JOIN public.profiles p2 ON p1.team = p2.team
            WHERE p1.id = auth.uid() 
            AND p1.role = 'team_lead'
            AND p2.id = daily_work_logs.user_id
        )
    );

-- Comments on table
COMMENT ON TABLE public.daily_work_logs IS 'Stores daily work updates from employees for reporting and tracking';
COMMENT ON COLUMN public.daily_work_logs.work_description IS 'Description of work done during the day';
COMMENT ON COLUMN public.daily_work_logs.tasks_completed IS 'Array of task identifiers completed';
COMMENT ON COLUMN public.daily_work_logs.hours_worked IS 'Total hours worked on this date';
COMMENT ON COLUMN public.daily_work_logs.challenges IS 'Challenges faced during the day';
COMMENT ON COLUMN public.daily_work_logs.achievements IS 'Key achievements or milestones';
