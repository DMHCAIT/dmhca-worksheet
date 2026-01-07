-- Fix existing users to have department field populated
-- Run this in Supabase SQL Editor

-- First, check current state
SELECT 
  id, 
  email, 
  full_name,
  team,
  department,
  CASE 
    WHEN department IS NULL OR department = '' THEN 'Missing'
    ELSE 'OK'
  END as department_status
FROM public.profiles
ORDER BY created_at DESC;

-- Update users to copy team value to department if department is missing
UPDATE public.profiles
SET 
  department = COALESCE(department, team, 'No department'),
  updated_at = NOW()
WHERE department IS NULL OR department = '';

-- Verify the update
SELECT 
  id, 
  email, 
  full_name,
  team,
  department,
  'Updated' as status
FROM public.profiles
WHERE updated_at > NOW() - INTERVAL '1 minute'
ORDER BY updated_at DESC;

-- Show summary
SELECT 
  department,
  COUNT(*) as user_count
FROM public.profiles
GROUP BY department
ORDER BY user_count DESC;
