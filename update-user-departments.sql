-- Update existing users without department/team to have a default department
-- Run this in your Supabase SQL Editor

-- First, let's see users without department/team
SELECT id, email, full_name, team, role 
FROM profiles 
WHERE team IS NULL OR team = '';

-- Update users without team to have 'IT' as default
-- You can change this to assign specific departments based on email or other criteria
UPDATE profiles 
SET team = 'it'
WHERE team IS NULL OR team = '';

-- OR update specific users by email:
-- UPDATE profiles SET team = 'admin' WHERE email = 'admin@example.com';
-- UPDATE profiles SET team = 'digital marketing' WHERE email = 'marketing@example.com';
-- UPDATE profiles SET team = 'sales' WHERE email = 'sales@example.com';
-- UPDATE profiles SET team = 'it' WHERE email = 'tech@example.com';

-- Verify the update
SELECT id, email, full_name, team, role 
FROM profiles 
ORDER BY created_at DESC;
