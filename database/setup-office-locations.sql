-- Office Locations Setup Script
-- Run this in Supabase SQL Editor to ensure Delhi and Hyderabad branches are available

-- Create office_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.office_locations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  cycle_type VARCHAR(20) DEFAULT 'calendar',
  cycle_start_day INTEGER DEFAULT 1,
  work_start_time TIME DEFAULT '10:00:00',
  work_end_time TIME DEFAULT '19:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add branch_id to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN branch_id BIGINT REFERENCES public.office_locations(id);
  END IF;
END $$;

-- Create unique constraint on office name (before INSERT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_office_locations_name ON public.office_locations(name);

-- Remove any duplicate office locations (keep the latest)
DELETE FROM public.office_locations 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM public.office_locations 
  GROUP BY name
);

-- Insert/Update Delhi and Hyderabad branches
INSERT INTO public.office_locations (name, latitude, longitude, radius_meters, is_active, cycle_type, cycle_start_day, work_start_time, work_end_time) VALUES
  ('DMHCA Delhi Branch', 28.492361, 77.163533, 100, true, 'calendar', 1, '10:00:00', '19:00:00'),
  ('DMHCA Hyderabad Branch', 17.42586, 78.44508, 100, true, 'custom', 26, '10:00:00', '19:00:00'),
  ('DMHCA Head Office', 28.7041, 77.1025, 100, true, 'calendar', 1, '09:00:00', '18:00:00')
ON CONFLICT (name) DO UPDATE SET 
  is_active = EXCLUDED.is_active,
  cycle_type = EXCLUDED.cycle_type,
  cycle_start_day = EXCLUDED.cycle_start_day,
  work_start_time = EXCLUDED.work_start_time,
  work_end_time = EXCLUDED.work_end_time,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- Enable RLS on office_locations table
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "All authenticated users can view office locations" ON public.office_locations;
DROP POLICY IF EXISTS "Only admins can modify office locations" ON public.office_locations;

-- Create RLS policy for office_locations (all authenticated users can read)
CREATE POLICY "All authenticated users can view office locations"
  ON public.office_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Create RLS policy for office_locations (only admins can modify)
CREATE POLICY "Only admins can modify office locations"
  ON public.office_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Verify the data was inserted correctly
SELECT 
  id, 
  name, 
  ROUND(latitude::numeric, 6) as lat, 
  ROUND(longitude::numeric, 6) as lng, 
  is_active, 
  cycle_type,
  work_start_time,
  work_end_time
FROM public.office_locations 
WHERE is_active = true 
ORDER BY name;