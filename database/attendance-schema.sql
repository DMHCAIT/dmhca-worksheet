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

-- Add new columns to office_locations table (if not exists)
DO $$ 
BEGIN
  -- Add work_start_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_locations' AND column_name = 'work_start_time'
  ) THEN
    ALTER TABLE public.office_locations ADD COLUMN work_start_time TIME DEFAULT '10:00:00';
  END IF;
  
  -- Add work_end_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_locations' AND column_name = 'work_end_time'
  ) THEN
    ALTER TABLE public.office_locations ADD COLUMN work_end_time TIME DEFAULT '19:00:00';
  END IF;
  
  -- Add cycle_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_locations' AND column_name = 'cycle_type'
  ) THEN
    ALTER TABLE public.office_locations ADD COLUMN cycle_type VARCHAR(20) DEFAULT 'calendar';
  END IF;
  
  -- Add cycle_start_day column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_locations' AND column_name = 'cycle_start_day'
  ) THEN
    ALTER TABLE public.office_locations ADD COLUMN cycle_start_day INTEGER DEFAULT 1;
  END IF;
END $$;

-- Remove duplicate office locations (keep the one with the highest id)
DELETE FROM public.office_locations 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM public.office_locations 
  GROUP BY name
);

-- Create unique constraint on office name (before INSERT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_office_locations_name ON public.office_locations(name);

-- Insert office locations (Delhi and Hyderabad branches) with specific cycles
INSERT INTO public.office_locations (name, latitude, longitude, radius_meters, cycle_type, cycle_start_day) VALUES
  ('DMHCA Delhi Branch', 28.492361, 77.163533, 100, 'calendar', 1),
  ('DMHCA Hyderabad Branch', 17.42586, 78.44508, 100, 'custom', 26)
ON CONFLICT (name) DO UPDATE SET 
  cycle_type = EXCLUDED.cycle_type,
  cycle_start_day = EXCLUDED.cycle_start_day,
  work_start_time = COALESCE(office_locations.work_start_time, '10:00:00'),
  work_end_time = COALESCE(office_locations.work_end_time, '19:00:00');

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

-- Function to get attendance period dates based on branch cycle
CREATE OR REPLACE FUNCTION public.get_attendance_period(
  branch_id BIGINT,
  reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(period_start DATE, period_end DATE, period_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  office_record RECORD;
  start_date DATE;
  end_date DATE;
  period_label TEXT;
BEGIN
  -- Get office cycle settings
  SELECT cycle_type, cycle_start_day
  INTO office_record
  FROM office_locations
  WHERE id = branch_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;
  
  IF office_record.cycle_type = 'calendar' THEN
    -- Delhi: Calendar month (1st to last day of month)
    start_date := date_trunc('month', reference_date)::DATE;
    end_date := (date_trunc('month', reference_date) + interval '1 month - 1 day')::DATE;
    period_label := to_char(reference_date, 'Month YYYY');
  ELSE
    -- Hyderabad: 26th to 25th cycle
    IF extract(day FROM reference_date) >= office_record.cycle_start_day THEN
      -- Current cycle: 26th of current month to 25th of next month
      start_date := make_date(extract(year FROM reference_date)::INT, 
                             extract(month FROM reference_date)::INT, 
                             office_record.cycle_start_day);
      end_date := (start_date + interval '1 month - 1 day')::DATE;
    ELSE
      -- Previous cycle: 26th of previous month to 25th of current month
      start_date := (date_trunc('month', reference_date) - interval '1 month')::DATE + 
                   (office_record.cycle_start_day - 1);
      end_date := make_date(extract(year FROM reference_date)::INT, 
                           extract(month FROM reference_date)::INT, 
                           office_record.cycle_start_day - 1);
    END IF;
    
    period_label := to_char(start_date, 'DD Mon') || ' to ' || to_char(end_date, 'DD Mon YYYY');
  END IF;
  
  RETURN QUERY SELECT start_date, end_date, period_label;
END;
$$;

-- Function to check if attendance time is within working hours
CREATE OR REPLACE FUNCTION public.is_within_working_hours(
  branch_id BIGINT,
  check_time TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  office_record RECORD;
  time_only TIME;
BEGIN
  -- Get office working hours
  SELECT work_start_time, work_end_time
  INTO office_record
  FROM office_locations
  WHERE id = branch_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Extract time part from timestamp
  time_only := check_time::TIME;
  
  -- Check if within working hours
  RETURN time_only >= office_record.work_start_time 
         AND time_only <= office_record.work_end_time;
END;
$$;