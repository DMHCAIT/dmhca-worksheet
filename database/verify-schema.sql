-- Database Schema Verification Script
-- Run this in Supabase SQL Editor to check if all required components exist

-- 1. Check if attendance_records table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if office_locations table exists  
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'office_locations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if profiles table exists (required for foreign key)
SELECT COUNT(*) as profiles_table_exists 
FROM information_schema.tables 
WHERE table_name = 'profiles' 
  AND table_schema = 'public';

-- 4. Check if is_within_geofence function exists
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_name = 'is_within_geofence' 
  AND routine_schema = 'public';

-- 5. Check configured office locations (should show Delhi and Hyderabad)
SELECT 
  id,
  name,
  latitude,
  longitude,
  radius_meters,
  is_active
FROM public.office_locations 
WHERE is_active = true
ORDER BY id;

-- 6. Show any existing attendance records
SELECT 
    id,
    user_id,
    date,
    clock_in_time,
    clock_out_time,
    is_within_office
FROM public.attendance_records 
ORDER BY created_at DESC 
LIMIT 5;