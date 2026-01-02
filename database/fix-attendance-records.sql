-- Fix Attendance Records - Clean up invalid locations
-- Run this in Supabase SQL Editor after deploying the main schema

-- First, let's check if the geofence function is working correctly for both offices
SELECT 
  id,
  user_id,
  clock_in_location->'lat' as lat,
  clock_in_location->'lng' as lng,
  is_within_office,
  is_within_geofence(
    CAST(clock_in_location->'lat' AS DECIMAL), 
    CAST(clock_in_location->'lng' AS DECIMAL)
  ) as should_be_valid
FROM attendance_records
WHERE date = '2026-01-02';

-- Fix Delhi record (should be valid - 31 meters from Delhi office)
UPDATE attendance_records 
SET is_within_office = true 
WHERE clock_in_location->'lat' = '28.492489031901137'
  AND clock_in_location->'lng' = '77.1632535096067'
  AND date = '2026-01-02';

-- Fix Hyderabad record (should be valid - now a valid office location)
UPDATE attendance_records 
SET is_within_office = true 
WHERE clock_in_location->'lat' = '17.42586'
  AND clock_in_location->'lng' = '78.44508'
  AND date = '2026-01-02';

-- Verify the results - should show both records as valid
SELECT 
  id,
  user_id,
  clock_in_time,
  clock_in_location->'lat' as lat,
  clock_in_location->'lng' as lng,
  is_within_office,
  date,
  CASE 
    WHEN clock_in_location->'lat'::text = '28.492489031901137' THEN 'Delhi Office'
    WHEN clock_in_location->'lat'::text = '17.42586' THEN 'Hyderabad Office'
    ELSE 'Unknown Location'
  END as office_location
FROM attendance_records
WHERE date = '2026-01-02'
ORDER BY clock_in_time;