-- Fix Attendance Records - Clean up invalid locations
-- Run this in Supabase SQL Editor after deploying the main schema

-- First, let's check if the geofence function is working correctly
SELECT 
  id,
  user_id,
  clock_in_location->'lat' as lat,
  clock_in_location->'lng' as lng,
  is_within_office,
  is_within_geofence(
    CAST(clock_in_location->'lat' AS DECIMAL), 
    CAST(clock_in_location->'lng' AS DECIMAL), 
    1
  ) as should_be_valid
FROM attendance_records
WHERE date = '2026-01-02';

-- Delete the Hyderabad record (outside office)
DELETE FROM attendance_records 
WHERE clock_in_location->'lat' = '17.439182117789965'
  AND clock_in_location->'lng' = '78.48585283379724';

-- Fix the Delhi record (should be valid - 31 meters from office)
UPDATE attendance_records 
SET is_within_office = true 
WHERE clock_in_location->'lat' = '28.492489031901137'
  AND clock_in_location->'lng' = '77.1632535096067'
  AND date = '2026-01-02';

-- Verify the results
SELECT 
  id,
  user_id,
  clock_in_time,
  clock_in_location->'lat' as lat,
  clock_in_location->'lng' as lng,
  is_within_office,
  date
FROM attendance_records
WHERE date = '2026-01-02'
ORDER BY clock_in_time;