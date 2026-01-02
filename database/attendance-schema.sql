-- Attendance System Database Schema
-- Run this in Supabase SQL Editor

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ NULL,
  clock_in_location JSONB NOT NULL, -- { lat: number, lng: number, accuracy: number }
  clock_out_location JSONB NULL,
  is_within_office BOOLEAN NOT NULL DEFAULT false,
  total_hours DECIMAL(5,2) NULL, -- calculated when clocked out
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add branch_id column to profiles table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN branch_id BIGINT REFERENCES public.office_locations(id);
  END IF;
END $$;

-- Create office_locations table (configurable office locations)
CREATE TABLE IF NOT EXISTS public.office_locations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert office locations (Delhi and Hyderabad branches)
INSERT INTO public.office_locations (name, latitude, longitude, radius_meters) VALUES
  ('DMHCA Delhi Branch', 28.492361, 77.163533, 100),
  ('DMHCA Hyderabad Branch', 17.42586, 78.44508, 100)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON public.attendance_records(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_records
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance_records;
CREATE POLICY "Users can view their own attendance" ON public.attendance_records
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance_records;
CREATE POLICY "Users can insert their own attendance" ON public.attendance_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance_records;
CREATE POLICY "Users can update their own attendance" ON public.attendance_records
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance_records;
CREATE POLICY "Admins can view all attendance" ON public.attendance_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for office_locations
DROP POLICY IF EXISTS "All authenticated users can view office locations" ON public.office_locations;
CREATE POLICY "All authenticated users can view office locations" ON public.office_locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage office locations" ON public.office_locations;
CREATE POLICY "Admins can manage office locations" ON public.office_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to check if user is within any active office geofence
CREATE OR REPLACE FUNCTION public.is_within_geofence(
  user_lat DECIMAL,
  user_lon DECIMAL,
  office_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  office_record RECORD;
  distance_meters DECIMAL;
BEGIN
  -- If office_id is specified, check only that office
  IF office_id IS NOT NULL THEN
    SELECT latitude, longitude, radius_meters
    INTO office_record
    FROM office_locations
    WHERE id = office_id AND is_active = true;
    
    IF NOT FOUND THEN
      RETURN false;
    END IF;
    
    -- Calculate distance using Haversine formula
    distance_meters := (
      6371000 * acos(
        cos(radians(office_record.latitude)) * 
        cos(radians(user_lat)) * 
        cos(radians(user_lon) - radians(office_record.longitude)) + 
        sin(radians(office_record.latitude)) * 
        sin(radians(user_lat))
      )
    );
    
    RETURN distance_meters <= office_record.radius_meters;
  ELSE
    -- Check all active offices - return true if within ANY office geofence
    FOR office_record IN 
      SELECT latitude, longitude, radius_meters 
      FROM office_locations 
      WHERE is_active = true
    LOOP
      -- Calculate distance using Haversine formula
      distance_meters := (
        6371000 * acos(
          cos(radians(office_record.latitude)) * 
          cos(radians(user_lat)) * 
          cos(radians(user_lon) - radians(office_record.longitude)) + 
          sin(radians(office_record.latitude)) * 
          sin(radians(user_lat))
        )
      );
      
      -- If within any office radius, return true
      IF distance_meters <= office_record.radius_meters THEN
        RETURN true;
      END IF;
    END LOOP;
    
    -- Not within any office geofence
    RETURN false;
  END IF;
END;
$$;