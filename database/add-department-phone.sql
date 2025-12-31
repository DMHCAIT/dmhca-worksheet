-- Add department and phone columns to profiles table
-- Run this in Supabase SQL Editor

-- Add department column (defaults to team value for existing users)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add phone column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Update existing users to have department = team if department is null
UPDATE public.profiles 
SET department = team 
WHERE department IS NULL AND team IS NOT NULL;

-- Add index for department filtering
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

-- Add index for phone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Update the updated_at timestamp function to include new columns
-- (This ensures updated_at changes when department or phone is modified)
