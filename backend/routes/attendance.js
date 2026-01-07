const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Check if user is within any office geofence
async function isWithinOfficeGeofence(latitude, longitude) {
  try {
    // First try using the database function
    const { data: isValid, error } = await supabase
      .rpc('is_within_geofence', {
        user_lat: latitude,
        user_lon: longitude
      });

    if (!error && isValid !== null) {
      return isValid;
    }

    console.warn('⚠️ Database function not available, using JavaScript fallback');
    
    // Fallback: Check manually against all active offices
    const { data: offices, error: officeError } = await supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', true);

    if (officeError || !offices || offices.length === 0) {
      console.error('❌ No active offices found');
      return false;
    }

    // Check if within range of any office
    for (const office of offices) {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        parseFloat(office.latitude), 
        parseFloat(office.longitude)
      );
      
      console.log(`📍 Distance from ${office.name}: ${distance.toFixed(2)}m (limit: ${office.radius_meters}m)`);
      
      if (distance <= office.radius_meters) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Error checking geofence:', error);
    return false;
  }
}

// Get current attendance status for today
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('📅 GET /api/attendance/status - User:', req.user.email, 'Date:', today);
    
    // Get attendance record for today (most recent if multiple exist)
    const { data: attendanceRecords, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('clock_in_time', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error fetching attendance:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    const attendance = attendanceRecords && attendanceRecords.length > 0 ? attendanceRecords[0] : null;

    // Get office settings for geofence info
    const { data: offices, error: officeError } = await supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (officeError) {
      console.error('❌ Error fetching office settings:', officeError);
      // Don't fail the whole request if office settings are missing
      console.warn('⚠️ Office settings not available, continuing without office info');
    }

    const office = offices && offices.length > 0 ? offices[0] : null;

    const response = {
      success: true,
      data: {
        attendance: attendance || null,
        office: office || null,
        canCheckIn: !attendance || !attendance.clock_in_time,
        canCheckOut: attendance && attendance.clock_in_time && !attendance.clock_out_time
      }
    };

    console.log('✅ Attendance status retrieved:', response.data);
    res.json(response);
  } catch (error) {
    console.error('❌ Server error fetching attendance status:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Check in with location validation
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    console.log('🏢 POST /api/attendance/checkin - User:', req.user.email);
    console.log('📍 Location:', { latitude, longitude, accuracy });

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_LOCATION', message: 'Location coordinates are required' }
      });
    }

    // Check if user already checked in today (get most recent if multiple exist)
    const { data: attendanceRecords, error: checkError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('clock_in_time', { ascending: false })
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking existing attendance:', checkError);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: checkError.message } 
      });
    }

    const existingAttendance = attendanceRecords && attendanceRecords.length > 0 ? attendanceRecords[0] : null;

    if (existingAttendance && existingAttendance.clock_in_time) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_IN', message: 'You have already checked in today' }
      });
    }

    // Validate location using the database function (checks all active offices)
    const isValidLocation = await isWithinOfficeGeofence(latitude, longitude);

    console.log('🎯 Location validation result:', isValidLocation);

    // REJECT clock-in if not within office geofence
    if (!isValidLocation) {
      console.log('❌ Clock-in rejected: User is outside office geofence');
      return res.status(400).json({
        success: false,
        error: { 
          code: 'LOCATION_OUTSIDE_OFFICE', 
          message: 'You must be within the office premises to clock in' 
        }
      });
    }

    const locationData = { lat: latitude, lng: longitude, accuracy };
    const attendanceData = {
      user_id: userId,
      date: today,
      clock_in_time: now,
      clock_in_location: locationData,
      is_within_office: true, // Always true now since we reject invalid locations
      updated_at: now
    };

    let result;
    if (existingAttendance) {
      // Update existing record
      const { data, error } = await supabase
        .from('attendance_records')
        .update(attendanceData)
        .eq('id', existingAttendance.id)
        .select('*')
        .single();
      
      result = { data, error };
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('attendance_records')
        .insert(attendanceData)
        .select('*')
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('❌ Error saving check-in:', result.error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: result.error.message } 
      });
    }

    const response = {
      success: true,
      data: {
        attendance: result.data,
        isValidLocation: true, // Always true since invalid locations are rejected
        message: 'Successfully checked in from office location'
      }
    };

    console.log('✅ Check-in successful:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Server error during check-in:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Check out with location validation
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    console.log('🏃 POST /api/attendance/checkout - User:', req.user.email);
    console.log('📍 Location:', { latitude, longitude, accuracy });
    console.log('📅 Date:', today);

    // Validate input
    if (!latitude || !longitude) {
      console.log('❌ Missing location coordinates');
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_LOCATION', message: 'Location coordinates are required' }
      });
    }

    // Check if user has checked in today (get most recent if multiple exist)
    const { data: attendanceRecords, error: checkError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('clock_in_time', { ascending: false })
      .limit(1);

    const existingAttendance = attendanceRecords && attendanceRecords.length > 0 ? attendanceRecords[0] : null;

    console.log('🔍 Existing attendance check:', { existingAttendance, error: checkError });

    if (checkError) {
      console.error('❌ Database error checking attendance:', checkError);
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: checkError.message }
      });
    }
      });
    }

    if (!existingAttendance) {
      console.log('❌ No check-in record found');
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_CHECKED_IN', message: 'You must check in first before checking out' }
      });
    }

    if (!existingAttendance.clock_in_time) {
      console.log('❌ No clock-in time found in record');
      return res.status(400).json({
        success: false,
        error: { code: 'NO_CLOCK_IN_TIME', message: 'Invalid attendance record: no clock-in time found' }
      });
    }

    if (existingAttendance.clock_out_time) {
      console.log('❌ Already clocked out:', existingAttendance.clock_out_time);
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_OUT', message: 'You have already checked out today' }
      });
    }

    // Validate location (checks all active offices)
    const isValidLocation = await isWithinOfficeGeofence(latitude, longitude);

    console.log('🎯 Location validation result:', isValidLocation);

    // Calculate total hours worked
    const checkInTime = new Date(existingAttendance.clock_in_time);
    const checkOutTime = new Date(now);
    const totalHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2); // Hours with 2 decimal places

    console.log('⏱️ Time calculation:', {
      checkIn: checkInTime.toISOString(),
      checkOut: checkOutTime.toISOString(),
      totalHours: totalHours
    });

    const locationData = { lat: latitude, lng: longitude, accuracy };
    const updateData = {
      clock_out_time: now,
      clock_out_location: locationData,
      total_hours: parseFloat(totalHours),
      updated_at: now
    };

    console.log('📝 Updating attendance with:', updateData);

    const { data: updatedAttendance, error: updateError } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', existingAttendance.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Error saving check-out:', updateError);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: updateError.message } 
      });
    }

    const response = {
      success: true,
      data: {
        attendance: updatedAttendance,
        isValidLocation,
        totalHours: parseFloat(totalHours),
        message: isValidLocation 
          ? `Successfully checked out from office. Total hours: ${totalHours}` 
          : `Checked out from outside office premises. Total hours: ${totalHours}`
      }
    };

    console.log('✅ Check-out successful:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Server error during check-out:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get attendance history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    
    console.log('📊 GET /api/attendance/history - User:', req.user.email);
    
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: attendance, error } = await query;

    if (error) {
      console.error('❌ Error fetching attendance history:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    // Calculate summary statistics
    const totalDays = attendance?.length || 0;
    const validCheckIns = attendance?.filter(a => a.is_within_office).length || 0;
    const totalHours = attendance?.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0) || 0;

    const response = {
      success: true,
      data: {
        attendance: attendance || [],
        summary: {
          totalDays,
          validCheckIns,
          totalHours: totalHours.toFixed(2),
          averageHours: totalDays > 0 ? (totalHours / totalDays).toFixed(2) : '0.00'
        }
      }
    };

    console.log('✅ Attendance history retrieved:', `${totalDays} records`);
    res.json(response);
  } catch (error) {
    console.error('❌ Server error fetching attendance history:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Admin endpoint: Get all users' attendance for a specific date
router.get('/admin/daily/:date', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { date } = req.params;
    
    console.log('👔 GET /api/attendance/admin/daily - Date:', date);
    
    const { data: attendance, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        user:profiles!user_id(
          id, full_name, email, role, team
        )
      `)
      .eq('date', date)
      .order('user.full_name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching daily attendance:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    // Calculate daily summary
    const totalEmployees = attendance?.length || 0;
    const presentEmployees = attendance?.filter(a => a.clock_in_time && a.is_within_office).length || 0;
    const totalHours = attendance?.reduce((sum, a) => sum + (parseFloat(a.total_hours) || 0), 0) || 0;

    const response = {
      success: true,
      data: {
        attendance: attendance || [],
        summary: {
          date,
          totalEmployees,
          presentEmployees,
          absentEmployees: Math.max(0, totalEmployees - presentEmployees),
          totalHours: totalHours.toFixed(2)
        }
      }
    };

    console.log('✅ Daily attendance retrieved:', response.data.summary);
    res.json(response);
  } catch (error) {
    console.error('❌ Server error fetching daily attendance:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get/Update office settings (admin only)
router.get('/office-settings', authMiddleware, async (req, res) => {
  try {
    const { data: officeSettings, error } = await supabase
      .from('office_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error fetching office settings:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    const office = officeSettings && officeSettings.length > 0 ? officeSettings[0] : null;

    res.json({ 
      success: true, 
      data: office 
    });
  } catch (error) {
    console.error('❌ Server error fetching office settings:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

router.put('/office-settings', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { office_name, latitude, longitude, geofence_radius, address, working_hours_start, working_hours_end, timezone } = req.body;

    const { data: office, error } = await supabase
      .from('office_settings')
      .update({
        office_name,
        latitude,
        longitude,
        geofence_radius,
        address,
        working_hours_start,
        working_hours_end,
        timezone,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error updating office settings:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true, 
      data: office,
      message: 'Office settings updated successfully'
    });
  } catch (error) {
    console.error('❌ Server error updating office settings:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Admin reports endpoint - Get all attendance records with branch-specific filtering
router.get('/reports', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { date, range, employee, startDate, endDate, branch } = req.query;
    
    console.log('📊 GET /api/attendance/reports - Admin:', req.user.email);
    console.log('🔍 Filters:', { date, range, employee, startDate, endDate, branch });
    
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        user:profiles!user_id(
          id, full_name, email, role, department, team, branch_id,
          office_locations:branch_id(id, name, cycle_type, cycle_start_day)
        )
      `)
      .order('created_at', { ascending: false });

    // Handle branch-specific date filtering
    if (branch && (range === 'current_period' || (!date && !startDate && !endDate))) {
      // Get current attendance period for specific branch
      const { data: periodData, error: periodError } = await supabase
        .rpc('get_attendance_period', {
          branch_id: parseInt(branch),
          reference_date: new Date().toISOString().split('T')[0]
        });

      if (periodError) {
        console.error('❌ Error getting attendance period:', periodError);
      } else if (periodData && periodData.length > 0) {
        const period = periodData[0];
        query = query.gte('date', period.period_start).lte('date', period.period_end);
        console.log('📅 Using branch period:', period.period_name, period.period_start, 'to', period.period_end);
      }
    } else if (range === 'today' || date) {
      const targetDate = date || new Date().toISOString().split('T')[0];
      query = query.eq('date', targetDate);
    } else if (range === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('date', weekAgo.toISOString().split('T')[0]);
    } else if (range === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte('date', monthAgo.toISOString().split('T')[0]);
    }

    // Apply date range filter
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Apply employee filter
    if (employee) {
      query = query.eq('user_id', employee);
    }

    // Apply branch filter (filter users by branch)
    if (branch && range !== 'current_period') {
      // First get users from specific branch
      const { data: branchUsers, error: branchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('branch_id', parseInt(branch));
        
      if (!branchError && branchUsers && branchUsers.length > 0) {
        const userIds = branchUsers.map(u => u.id);
        query = query.in('user_id', userIds);
      }
    }

    const { data: attendanceRecords, error } = await query;

    if (error) {
      console.error('❌ Error fetching attendance reports:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    // Process records to include user and branch information
    const records = (attendanceRecords || []).map(record => {
      const branchInfo = record.user?.office_locations;
      const isWithinWorkingHours = branchInfo ? 
        checkWorkingHours(record.clock_in_time, branchInfo.id) : true;
        
      return {
        id: record.id,
        user_id: record.user_id,
        user_name: record.user?.full_name || record.user?.email || 'Unknown',
        user_email: record.user?.email || '',
        user_department: record.user?.department || '',
        user_team: record.user?.team || '',
        branch_name: branchInfo?.name || 'No Branch',
        branch_cycle: branchInfo?.cycle_type || 'calendar',
        clock_in_time: record.clock_in_time,
        clock_out_time: record.clock_out_time,
        clock_in_location: record.clock_in_location,
        clock_out_location: record.clock_out_location,
        is_within_office: record.is_within_office,
        is_within_working_hours: isWithinWorkingHours,
        total_hours: record.total_hours,
        date: record.date,
        created_at: record.created_at
      };
    });

    // Calculate branch-aware summary statistics
    const totalEmployees = new Set(records.map(r => r.user_id)).size;
    const presentToday = range === 'today' || date ? 
      records.filter(r => r.clock_in_time && r.is_within_office).length : 0;
    const onTimeCount = records.filter(r => r.is_within_working_hours && r.clock_in_time).length;
    const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0);
    const averageHours = records.length > 0 ? (totalHours / records.length) : 0;

    // Group by branch for summary
    const branchSummary = records.reduce((acc, record) => {
      const branch = record.branch_name;
      if (!acc[branch]) {
        acc[branch] = {
          name: branch,
          cycle: record.branch_cycle,
          totalRecords: 0,
          presentEmployees: 0,
          onTimeEmployees: 0,
          totalHours: 0
        };
      }
      acc[branch].totalRecords++;
      if (record.clock_in_time && record.is_within_office) {
        acc[branch].presentEmployees++;
      }
      if (record.is_within_working_hours) {
        acc[branch].onTimeEmployees++;
      }
      acc[branch].totalHours += parseFloat(record.total_hours) || 0;
      return acc;
    }, {});

    const response = {
      success: true,
      data: {
        records,
        summary: {
          totalEmployees,
          presentToday,
          onTimeCount,
          totalHours: parseFloat(totalHours.toFixed(2)),
          averageHours: parseFloat(averageHours.toFixed(2)),
          branchSummary: Object.values(branchSummary)
        }
      }
    };

    console.log('✅ Attendance reports retrieved:', `${records.length} records, ${totalEmployees} employees`);
    res.json(response);
  } catch (error) {
    console.error('❌ Server error fetching attendance reports:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Helper function to check working hours (simplified version for backend)
function checkWorkingHours(clockInTime, branchId) {
  if (!clockInTime) return false;
  
  const time = new Date(clockInTime);
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Working hours: 10:00 AM (600 minutes) to 7:00 PM (1140 minutes)
  const startTime = 10 * 60; // 10:00 AM
  const endTime = 19 * 60;   // 7:00 PM
  
  return timeInMinutes >= startTime && timeInMinutes <= endTime;
}

// Live attendance monitoring endpoint
router.get('/live', authMiddleware, requireRole(['admin', 'team_lead']), async (req, res) => {
  try {
    const { branch } = req.query;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📊 GET /api/attendance/live - Branch filter:', branch);

    // Build query for live attendance
    let attendanceQuery = supabase
      .from('attendance_records')
      .select(`
        id,
        user_id,
        clock_in_time,
        clock_out_time,
        is_within_office,
        total_hours,
        date,
        profiles:user_id (
          id,
          full_name,
          email,
          role,
          department,
          branch_id,
          office_locations:branch_id (
            id,
            name,
            cycle_type
          )
        )
      `)
      .eq('date', today);

    // Add branch filter if specified
    if (branch) {
      attendanceQuery = attendanceQuery.eq('profiles.office_locations.name', branch);
    }

    const { data: attendanceRecords, error: attendanceError } = await attendanceQuery;

    if (attendanceError) {
      console.error('❌ Error fetching live attendance:', attendanceError);
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: attendanceError.message }
      });
    }

    // Get all users for comparison (to find absent users)
    let usersQuery = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        department,
        branch_id,
        office_locations:branch_id (
          id,
          name,
          cycle_type
        )
      `)
      .neq('role', 'admin');

    if (branch) {
      usersQuery = usersQuery.eq('office_locations.name', branch);
    }

    const { data: allUsers, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: usersError.message }
      });
    }

    // Process live attendance data
    const userAttendanceMap = new Map();
    attendanceRecords?.forEach(record => {
      if (record.profiles) {
        const user = record.profiles;
        userAttendanceMap.set(user.id, {
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email,
          department: user.department || 'Unassigned',
          branch_name: user.office_locations?.name || 'No Branch',
          status: record.clock_out_time ? 'clocked_out' : 'clocked_in',
          clock_in_time: record.clock_in_time,
          hours_worked: record.total_hours || 0,
          is_within_office: record.is_within_office
        });
      }
    });

    // Add users who haven't checked in
    const liveAttendances = [];
    allUsers?.forEach(user => {
      if (userAttendanceMap.has(user.id)) {
        liveAttendances.push(userAttendanceMap.get(user.id));
      } else {
        liveAttendances.push({
          user_id: user.id,
          user_name: user.full_name,
          user_email: user.email,
          department: user.department || 'Unassigned',
          branch_name: user.office_locations?.name || 'No Branch',
          status: 'not_started',
          clock_in_time: null,
          hours_worked: 0,
          is_within_office: false
        });
      }
    });

    // Calculate stats
    const stats = {
      totalEmployees: allUsers?.length || 0,
      currentlyWorking: attendanceRecords?.filter(r => r.clock_in_time && !r.clock_out_time).length || 0,
      onTimeToday: attendanceRecords?.filter(r => {
        if (!r.clock_in_time) return false;
        const clockInTime = new Date(`2000-01-01T${r.clock_in_time}`);
        return clockInTime <= new Date('2000-01-01T10:00:00');
      }).length || 0,
      lateToday: attendanceRecords?.filter(r => {
        if (!r.clock_in_time) return false;
        const clockInTime = new Date(`2000-01-01T${r.clock_in_time}`);
        return clockInTime > new Date('2000-01-01T10:00:00');
      }).length || 0,
      averageHours: attendanceRecords?.reduce((acc, r) => acc + (r.total_hours || 0), 0) / Math.max(attendanceRecords?.length || 0, 1),
      absentToday: (allUsers?.length || 0) - (attendanceRecords?.length || 0),
      remoteWorking: attendanceRecords?.filter(r => !r.is_within_office).length || 0,
      officeWorking: attendanceRecords?.filter(r => r.is_within_office).length || 0
    };

    res.json({
      success: true,
      data: {
        stats,
        attendances: liveAttendances
      }
    });
  } catch (error) {
    console.error('❌ Error in live attendance endpoint:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch live attendance data' }
    });
  }
});

// Enhanced records endpoint for monitoring
router.get('/records', authMiddleware, requireRole(['admin', 'team_lead']), async (req, res) => {
  try {
    const { date, branch, department, status } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log('📋 GET /api/attendance/records - Date:', targetDate, 'Branch:', branch, 'Dept:', department);

    // Build query
    let query = supabase
      .from('attendance_records')
      .select(`
        id,
        user_id,
        clock_in_time,
        clock_out_time,
        is_within_office,
        total_hours,
        date,
        created_at,
        profiles:user_id (
          id,
          full_name,
          email,
          role,
          department,
          branch_id,
          office_locations:branch_id (
            id,
            name,
            cycle_type
          )
        )
      `)
      .eq('date', targetDate)
      .order('clock_in_time', { ascending: false });

    // Add filters
    if (department) {
      query = query.eq('profiles.department', department);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('❌ Error fetching attendance records:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message }
      });
    }

    // Process and filter records
    let processedRecords = records?.map(record => ({
      id: record.id,
      user_id: record.user_id,
      user_name: record.profiles?.full_name || 'Unknown',
      user_email: record.profiles?.email || '',
      user_department: record.profiles?.department || '',
      user_role: record.profiles?.role || '',
      branch_name: record.profiles?.office_locations?.name || 'No Branch',
      branch_id: record.profiles?.branch_id || null,
      clock_in_time: record.clock_in_time,
      clock_out_time: record.clock_out_time,
      is_within_office: record.is_within_office,
      total_hours: record.total_hours,
      date: record.date,
      status: record.clock_out_time ? 'completed' : (record.clock_in_time ? 'active' : 'incomplete'),
      created_at: record.created_at
    })) || [];

    // Apply additional filters
    if (branch) {
      processedRecords = processedRecords.filter(record => record.branch_name === branch);
    }

    if (status) {
      processedRecords = processedRecords.filter(record => record.status === status);
    }

    res.json({
      success: true,
      data: {
        records: processedRecords
      }
    });
  } catch (error) {
    console.error('❌ Error in attendance records endpoint:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch attendance records' }
    });
  }
});

module.exports = router;