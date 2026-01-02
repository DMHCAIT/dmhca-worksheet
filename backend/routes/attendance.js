const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get current attendance status for today
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('📅 GET /api/attendance/status - User:', req.user.email, 'Date:', today);
    
    const { data: attendance, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle(); // Use maybeSingle to avoid error if no record found

    if (error) {
      console.error('❌ Error fetching attendance:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    // Get office settings for geofence info
    const { data: office, error: officeError } = await supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (officeError) {
      console.error('❌ Error fetching office settings:', officeError);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: officeError.message } 
      });
    }

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

    // Check if user already checked in today
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing attendance:', checkError);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: checkError.message } 
      });
    }

    if (existingAttendance && existingAttendance.clock_in_time) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_IN', message: 'You have already checked in today' }
      });
    }

    // Validate location using the database function
    const { data: isValidLocation, error: locationError } = await supabase
      .rpc('is_within_geofence', {
        user_lat: latitude,
        user_lon: longitude,
        office_id: 1 // Default office ID
      });

    if (locationError) {
      console.error('❌ Error validating location:', locationError);
      return res.status(400).json({ 
        success: false,
        error: { code: 'LOCATION_VALIDATION_ERROR', message: locationError.message } 
      });
    }

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

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_LOCATION', message: 'Location coordinates are required' }
      });
    }

    // Check if user has checked in today
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (checkError || !existingAttendance) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_CHECKED_IN', message: 'You must check in first before checking out' }
      });
    }

    if (existingAttendance.clock_out_time) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CHECKED_OUT', message: 'You have already checked out today' }
      });
    }

    // Validate location
    const { data: isValidLocation, error: locationError } = await supabase
      .rpc('is_within_geofence', {
        user_lat: latitude,
        user_lon: longitude,
        office_id: 1
      });

    if (locationError) {
      console.error('❌ Error validating location:', locationError);
      return res.status(400).json({ 
        success: false,
        error: { code: 'LOCATION_VALIDATION_ERROR', message: locationError.message } 
      });
    }

    // Calculate total hours worked
    const checkInTime = new Date(existingAttendance.clock_in_time);
    const checkOutTime = new Date(now);
    const totalHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2); // Hours with 2 decimal places

    const locationData = { latitude, longitude, accuracy };
    const updateData = {
      clock_out_time: now,
      clock_out_location: locationData,
      is_valid_checkout: isValidLocation,
      total_hours: parseFloat(totalHours),
      status: 'checked_out',
      updated_at: now
    };

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
          ? `Successfully checked out. Total hours: ${totalHours}` 
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
    const { data: office, error } = await supabase
      .from('office_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching office settings:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

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

// Admin reports endpoint - Get all attendance records with filtering
router.get('/reports', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { date, range, employee, startDate, endDate } = req.query;
    
    console.log('📊 GET /api/attendance/reports - Admin:', req.user.email);
    console.log('🔍 Filters:', { date, range, employee, startDate, endDate });
    
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        user:profiles!user_id(
          id, full_name, email, role, department, team
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters based on range or specific dates
    if (range === 'today' || date) {
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

    const { data: attendanceRecords, error } = await query;

    if (error) {
      console.error('❌ Error fetching attendance reports:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    // Process records to include user information
    const records = (attendanceRecords || []).map(record => ({
      id: record.id,
      user_id: record.user_id,
      user_name: record.user?.full_name || record.user?.email || 'Unknown',
      user_email: record.user?.email || '',
      user_department: record.user?.department || '',
      user_team: record.user?.team || '',
      clock_in_time: record.clock_in_time,
      clock_out_time: record.clock_out_time,
      clock_in_location: record.clock_in_location,
      clock_out_location: record.clock_out_location,
      is_within_office: record.is_within_office,
      total_hours: record.total_hours,
      date: record.date,
      created_at: record.created_at
    }));

    // Calculate summary statistics
    const totalEmployees = new Set(records.map(r => r.user_id)).size;
    const presentToday = range === 'today' || date ? 
      records.filter(r => r.clock_in_time && r.is_within_office).length : 0;
    const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0);
    const averageHours = records.length > 0 ? (totalHours / records.length) : 0;

    const response = {
      success: true,
      data: {
        records,
        summary: {
          totalEmployees,
          presentToday,
          totalHours: parseFloat(totalHours.toFixed(2)),
          averageHours: parseFloat(averageHours.toFixed(2))
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

module.exports = router;