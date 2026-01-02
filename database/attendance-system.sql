-- Location-Based Attendance System Database Schema
-- Run this script in Supabase SQL Editor

-- Create attendance table to track daily check-ins and check-outs
CREATE TABLE IF NOT EXISTS public.attendance (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_location JSONB, -- {latitude: 123.456, longitude: 78.901, accuracy: 10}
  check_out_location JSONB,
  total_hours DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'checked_in', -- 'checked_in', 'checked_out', 'partial'
  is_valid_checkin BOOLEAN DEFAULT true, -- false if location was outside geofence
  is_valid_checkout BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date) -- One record per user per day
);

-- Create office_settings table to store office location and geofence radius
CREATE TABLE IF NOT EXISTS public.office_settings (
  id BIGSERIAL PRIMARY KEY,
  office_name VARCHAR(255) NOT NULL DEFAULT 'Main Office',
  latitude DECIMAL(10,7) NOT NULL, -- Office GPS latitude
  longitude DECIMAL(10,7) NOT NULL, -- Office GPS longitude
  geofence_radius INTEGER DEFAULT 100, -- Radius in meters (100m = approx 330ft)
  address TEXT,
  working_hours_start TIME DEFAULT '09:00:00',
  working_hours_end TIME DEFAULT '18:00:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance table
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
CREATE POLICY "Users can view their own attendance" ON public.attendance
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
CREATE POLICY "Users can insert their own attendance" ON public.attendance
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;
CREATE POLICY "Users can update their own attendance" ON public.attendance
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance" ON public.attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for office_settings table
DROP POLICY IF EXISTS "All users can view office settings" ON public.office_settings;
CREATE POLICY "All users can view office settings" ON public.office_settings
  FOR SELECT
  USING (true); -- All authenticated users can read office location

DROP POLICY IF EXISTS "Only admins can modify office settings" ON public.office_settings;
CREATE POLICY "Only admins can modify office settings" ON public.office_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default office location (you can update this with your actual office coordinates)
INSERT INTO public.office_settings (
  office_name,
  latitude,
  longitude,
  geofence_radius,
  address,
  working_hours_start,
  working_hours_end,
  timezone
) VALUES (
  'DMHCA Main Office',
  28.6139, -- Replace with your actual office latitude
  77.2090, -- Replace with your actual office longitude
  100, -- 100 meter radius
  'New Delhi, India', -- Replace with your actual office address
  '10:00:00',
  '18:00:00',
  'Asia/Kolkata'
) ON CONFLICT DO NOTHING;

-- Create function to calculate distance between two GPS coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS INTEGER AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371000; -- Earth radius in meters
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
  distance DECIMAL;
BEGIN
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  -- Haversine formula
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * asin(sqrt(a));
  distance := earth_radius * c;
  
  RETURN distance::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if location is within office geofence
CREATE OR REPLACE FUNCTION public.is_within_geofence(
  user_lat DECIMAL,
  user_lon DECIMAL,
  office_id INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  office_lat DECIMAL;
  office_lon DECIMAL;
  geofence_radius INTEGER;
  distance INTEGER;
BEGIN
  -- Get office location and radius
  SELECT latitude, longitude, geofence_radius 
  INTO office_lat, office_lon, geofence_radius
  FROM public.office_settings 
  WHERE id = office_id AND is_active = true;
  
  IF office_lat IS NULL THEN
    RETURN false; -- No office found or not active
  END IF;
  
  -- Calculate distance
  distance := public.calculate_distance_meters(user_lat, user_lon, office_lat, office_lon);
  
  -- Return true if within geofence
  RETURN distance <= geofence_radius;
END;
$$ LANGUAGE plpgsql;