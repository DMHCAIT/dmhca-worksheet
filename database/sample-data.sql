-- Disable RLS for development and populate with sample data
-- Run this script in Supabase SQL Editor to setup sample data

-- Temporarily disable RLS for data insertion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_projections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Temporarily drop foreign key constraint to insert sample data
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Insert additional team members (using the same UUID pattern as existing admin)
INSERT INTO public.profiles (id, email, full_name, role, team) VALUES
('3cec16bd-bba2-4952-8007-c3926ec43a67', 'john.dev@company.com', 'John Developer', 'employee', 'development'),
('3cec16bd-bba2-4952-8007-c3926ec43a68', 'sarah.lead@company.com', 'Sarah Team Lead', 'team_lead', 'development'),
('3cec16bd-bba2-4952-8007-c3926ec43a69', 'mike.analyst@company.com', 'Mike Analyst', 'employee', 'analytics'),
('3cec16bd-bba2-4952-8007-c3926ec43a70', 'lisa.manager@company.com', 'Lisa Manager', 'admin', 'management')
ON CONFLICT (id) DO NOTHING;

-- Insert sample projects
INSERT INTO public.projects (name, description, team, status, deadline, created_by) VALUES
('Website Redesign', 'Complete redesign of company website with modern UI/UX', 'development', 'active', '2024-02-15', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Mobile App Development', 'Native mobile application for iOS and Android', 'development', 'active', '2024-03-30', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Data Analytics Dashboard', 'Real-time analytics dashboard for business metrics', 'analytics', 'active', '2024-02-28', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Marketing Campaign Tool', 'Internal tool for managing marketing campaigns', 'marketing', 'planning', '2024-04-15', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Customer Support Portal', 'Self-service portal for customer support', 'development', 'active', '2024-03-20', '3cec16bd-bba2-4952-8007-c3926ec43a66');

-- Insert sample tasks
INSERT INTO public.tasks (title, description, status, priority, project_id, assigned_to, team, deadline, created_by) VALUES
('Design Homepage Layout', 'Create wireframes and mockups for new homepage', 'in_progress', 'high', 1, '3cec16bd-bba2-4952-8007-c3926ec43a67', 'development', '2024-01-20', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Setup Development Environment', 'Configure development tools and dependencies', 'completed', 'medium', 1, '3cec16bd-bba2-4952-8007-c3926ec43a68', 'development', '2024-01-15', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Mobile UI Components', 'Develop reusable UI components for mobile app', 'pending', 'medium', 2, '3cec16bd-bba2-4952-8007-c3926ec43a67', 'development', '2024-02-10', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Data Collection Setup', 'Setup data pipelines for analytics dashboard', 'in_progress', 'high', 3, '3cec16bd-bba2-4952-8007-c3926ec43a69', 'analytics', '2024-01-25', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Database Migration', 'Migrate existing data to new schema', 'pending', 'high', 1, '3cec16bd-bba2-4952-8007-c3926ec43a68', 'development', '2024-01-30', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('API Documentation', 'Create comprehensive API documentation', 'pending', 'low', 2, '3cec16bd-bba2-4952-8007-c3926ec43a67', 'development', '2024-02-20', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('User Testing', 'Conduct user testing sessions for mobile app', 'pending', 'medium', 2, '3cec16bd-bba2-4952-8007-c3926ec43a68', 'development', '2024-03-10', '3cec16bd-bba2-4952-8007-c3926ec43a66'),
('Analytics Implementation', 'Implement tracking and analytics code', 'in_progress', 'medium', 3, '3cec16bd-bba2-4952-8007-c3926ec43a69', 'analytics', '2024-02-05', '3cec16bd-bba2-4952-8007-c3926ec43a66');

-- Insert sample work projections
INSERT INTO public.work_projections (title, description, week_start, week_end, planned_hours, actual_hours, goals, status, user_id, team) VALUES
('Week 1 Development Goals', 'Complete website redesign wireframes and setup', '2024-01-01', '2024-01-07', 40, 35, '{"tasks": ["Homepage wireframe", "Setup dev environment"]}', 'completed', '3cec16bd-bba2-4952-8007-c3926ec43a67', 'development'),
('Week 2 Analytics Work', 'Data pipeline setup and dashboard mockups', '2024-01-08', '2024-01-14', 40, 38, '{"tasks": ["Data collection setup", "Dashboard design"]}', 'completed', '3cec16bd-bba2-4952-8007-c3926ec43a69', 'analytics'),
('Week 3 Team Coordination', 'Review team progress and plan next sprint', '2024-01-15', '2024-01-21', 35, 32, '{"tasks": ["Team reviews", "Sprint planning"]}', 'completed', '3cec16bd-bba2-4952-8007-c3926ec43a68', 'development'),
('Week 4 Mobile Development', 'Start mobile app component development', '2024-01-22', '2024-01-28', 40, 0, '{"tasks": ["UI components", "Navigation setup"]}', 'draft', '3cec16bd-bba2-4952-8007-c3926ec43a67', 'development');

-- Insert sample notifications
INSERT INTO public.notifications (user_id, title, message, type, is_read, related_id, related_type) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Task Deadline Approaching', 'Your task "Design Homepage Layout" is due in 2 days', 'deadline', false, 1, 'task'),
('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'New Task Assigned', 'You have been assigned a new task: "Database Migration"', 'assignment', false, 5, 'task'),
('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Project Update', 'Data Analytics Dashboard project has been updated', 'update', true, 3, 'project'),
('3cec16bd-bba2-4952-8007-c3926ec43a66', 'Weekly Report Available', 'Weekly progress report is now available for review', 'info', false, null, null),
('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Team Meeting Reminder', 'Development team meeting scheduled for tomorrow at 2 PM', 'info', false, null, null);

-- Create simple policies to allow all operations (for development)
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