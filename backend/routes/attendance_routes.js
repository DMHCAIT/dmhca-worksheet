const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
}

// Get office locations
router.get('/office-locations', authMiddleware, async (req, res) => {
  try {
    const { data: locations, error } = await supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', true);

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: locations,
      message: 'Office locations retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Error fetching office locations:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Clock in
router.post('/clock-in', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Location coordinates required' }
      });
    }

    // Check if user already clocked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .is('clock_out_time', null)
      .maybeSingle();

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CLOCKED_IN', message: 'Already clocked in today' }
      });
    }

    // Get office locations
    const { data: officeLocations, error: officeError } = await supabase
      .from('office_locations')
      .select('*')
      .eq('is_active', true);

    if (officeError) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: officeError.message } 
      });
    }

    // Check if within any office location
    let isWithinOffice = false;
    for (const office of officeLocations) {
      const distance = calculateDistance(
        latitude, longitude,
        parseFloat(office.latitude), parseFloat(office.longitude)
      );
      
      if (distance <= office.radius_meters) {
        isWithinOffice = true;
        break;
      }
    }

    // Create attendance record
    const { data: record, error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        clock_in_time: new Date().toISOString(),
        clock_in_location: { lat: latitude, lng: longitude, accuracy },
        is_within_office: isWithinOffice,
        date: today
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: {
        ...record,
        is_within_office: isWithinOffice,
        status: isWithinOffice ? 'present' : 'remote'
      },
      message: `Clocked in successfully - ${isWithinOffice ? 'Present in office' : 'Working remotely'}` 
    });
  } catch (error) {
    console.error('❌ Error clocking in:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Clock out
router.post('/clock-out', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Location coordinates required' }
      });
    }

    // Find today's active clock-in record
    const today = new Date().toISOString().split('T')[0];
    const { data: record, error: findError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .is('clock_out_time', null)
      .maybeSingle();

    if (findError) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: findError.message } 
      });
    }

    if (!record) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_CLOCKED_IN', message: 'No active clock-in record found for today' }
      });
    }

    // Calculate total hours
    const clockInTime = new Date(record.clock_in_time);
    const clockOutTime = new Date();
    const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60); // hours

    // Update attendance record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        clock_out_location: { lat: latitude, lng: longitude, accuracy },
        total_hours: Math.round(totalHours * 100) / 100, // round to 2 decimal places
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: updateError.message } 
      });
    }

    res.json({ 
      success: true,
      data: {
        ...updatedRecord,
        total_hours: Math.round(totalHours * 100) / 100
      },
      message: `Clocked out successfully - Total hours: ${Math.round(totalHours * 100) / 100}` 
    });
  } catch (error) {
    console.error('❌ Error clocking out:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get current attendance status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: record, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .is('clock_out_time', null)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: {
        is_clocked_in: !!record,
        record: record || null,
        status: record ? (record.is_within_office ? 'present' : 'remote') : 'not_clocked_in'
      },
      message: 'Attendance status retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Error getting attendance status:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get attendance records (with pagination)
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, start_date, end_date } = req.query;
    
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: records, error, count } = await query
      .range(from, to)
      .count();

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      },
      message: 'Attendance records retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Error fetching attendance records:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;