-- Sample attendance data with clock in and clock out times
-- Run this in Supabase SQL Editor to add test data

-- First, let's add attendance policies if they don't exist
DO $$
BEGIN
  -- Add policies for attendance_records table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_records' AND policyname = 'Allow all operations'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all operations" ON public.attendance_records FOR ALL USING (true)';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Insert sample attendance records with both clock in and clock out times
INSERT INTO public.attendance_records (
  user_id, 
  clock_in_time, 
  clock_out_time, 
  clock_in_location, 
  clock_out_location, 
  is_within_office, 
  total_hours, 
  date
) VALUES 
-- Completed day 1
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
  '2026-01-02T09:00:00+00:00', 
  '2026-01-02T17:30:00+00:00',
  '{"lat": 28.492361, "lng": 77.163533, "accuracy": 10}',
  '{"lat": 28.492361, "lng": 77.163533, "accuracy": 15}',
  true,
  8.50,
  '2026-01-02'
),
-- Completed day 2
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
  '2026-01-03T08:45:00+00:00', 
  '2026-01-03T17:15:00+00:00',
  '{"lat": 28.492361, "lng": 77.163533, "accuracy": 8}',
  '{"lat": 28.492361, "lng": 77.163533, "accuracy": 12}',
  true,
  8.50,
  '2026-01-03'
),
-- Half day (clocked out early)
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
  '2026-01-05T10:00:00+00:00', 
  '2026-01-05T14:00:00+00:00',
  '{"lat": 28.492361, "lng": 77.163533, "accuracy": 15}',
  '{"lat": 28.492361, "lng": 77.163533, "accuracy": 10}',
  true,
  4.00,
  '2026-01-05'
),
-- Still clocked in (today) - no clock out time
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
  '2026-01-07T09:30:00+00:00', 
  NULL,
  '{"lat": 28.492361, "lng": 77.163533, "accuracy": 12}',
  NULL,
  true,
  NULL,
  '2026-01-07'
)
ON CONFLICT (user_id, date) DO UPDATE SET
  clock_in_time = EXCLUDED.clock_in_time,
  clock_out_time = EXCLUDED.clock_out_time,
  clock_in_location = EXCLUDED.clock_in_location,
  clock_out_location = EXCLUDED.clock_out_location,
  is_within_office = EXCLUDED.is_within_office,
  total_hours = EXCLUDED.total_hours;

-- Add unique constraint to prevent duplicate attendance records per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date_unique 
ON public.attendance_records(user_id, date);

-- Verify the data was inserted correctly
SELECT 
  user_id,
  date,
  clock_in_time,
  clock_out_time,
  total_hours,
  is_within_office,
  CASE 
    WHEN clock_out_time IS NULL THEN 'Still clocked in'
    ELSE 'Complete day'
  END as status
FROM public.attendance_records 
WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
ORDER BY date DESC;