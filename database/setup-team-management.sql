-- Simple setup for team member management
-- Run this in Supabase SQL Editor

-- Drop existing foreign key constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Create simple policies for development
DROP POLICY IF EXISTS "Allow all operations" ON public.profiles;
DROP POLICY IF EXISTS "Allow all operations" ON public.projects;
DROP POLICY IF EXISTS "Allow all operations" ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations" ON public.work_projections;
DROP POLICY IF EXISTS "Allow all operations" ON public.notifications;

-- Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_projections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all operations" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.projects FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.work_projections FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.notifications FOR ALL USING (true);

-- Re-enable RLS with permissive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;