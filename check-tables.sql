-- Run this in your Supabase SQL Editor to check if tables exist

-- Check if task_comments table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'task_comments'
) AS task_comments_exists;

-- Check if task_attachments table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'task_attachments'
) AS task_attachments_exists;

-- If tables don't exist, create them:
CREATE TABLE IF NOT EXISTS public.task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES public.tasks(id) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES public.tasks(id) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for task_comments
DROP POLICY IF EXISTS "Users can view comments" ON public.task_comments;
CREATE POLICY "Users can view comments" ON public.task_comments
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.task_comments;
CREATE POLICY "Users can create comments" ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Create policies for task_attachments
DROP POLICY IF EXISTS "Users can view attachments" ON public.task_attachments;
CREATE POLICY "Users can view attachments" ON public.task_attachments
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can create attachments" ON public.task_attachments;
CREATE POLICY "Users can create attachments" ON public.task_attachments
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete attachments" ON public.task_attachments;
CREATE POLICY "Users can delete attachments" ON public.task_attachments
    FOR DELETE TO authenticated
    USING (true);
