-- Check current user departments/teams
-- Run this in Supabase SQL Editor to see what data exists

SELECT 
  id, 
  email, 
  full_name, 
  role,
  team,
  created_at
FROM profiles 
ORDER BY created_at;

-- Update specific users based on their roles/emails
-- Uncomment and modify as needed:

-- Update Santhosh (Admin) to Admin department
UPDATE profiles 
SET team = 'admin'
WHERE email = 'santhosh@dmhca.in';

-- Update lahareesh to IT department
UPDATE profiles 
SET team = 'it'
WHERE email = 'lahareesh@dmhca.in';

-- Update rajesh to Sales department
UPDATE profiles 
SET team = 'sales'
WHERE email = 'rajesh@dmhca.in';

-- Verify the updates
SELECT 
  id, 
  email, 
  full_name, 
  role,
  team as department,
  created_at
FROM profiles 
ORDER BY created_at;
