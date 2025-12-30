-- Production Database Schema for Work Tracker
-- Run this script to set up the database without sample data

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for projects table
DROP POLICY IF EXISTS "Users can view projects in their team" ON projects;
CREATE POLICY "Users can view projects in their team" ON projects
  FOR SELECT USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
    )
  );

DROP POLICY IF EXISTS "Admins and team leads can manage projects" ON projects;
CREATE POLICY "Admins and team leads can manage projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
    )
  );

-- Create RLS policies for tasks table
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
    )
  );

DROP POLICY IF EXISTS "Users can update their assigned tasks" ON tasks;
CREATE POLICY "Users can update their assigned tasks" ON tasks
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
    )
  );

DROP POLICY IF EXISTS "Admins and team leads can manage tasks" ON tasks;
CREATE POLICY "Admins and team leads can manage tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
    )
  );

-- Create RLS policies for work_projections table
DROP POLICY IF EXISTS "Users can view their own projections" ON work_projections;
CREATE POLICY "Users can view their own projections" ON work_projections
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
    )
  );

DROP POLICY IF EXISTS "Users can manage their own projections" ON work_projections;
CREATE POLICY "Users can manage their own projections" ON work_projections
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
    )
  );

-- Create RLS policies for notifications table
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_work_projections_user_id ON work_projections(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);