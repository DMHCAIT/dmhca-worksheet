const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (all authenticated users can see all users - needed for chat)
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('👥 GET /api/users - User:', req.user?.email, 'Role:', req.user?.role);
    
    // Select all user fields without join to avoid relationship issues
    // NO TEAM FILTERING - All users can see all users for chat functionality
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    console.log('📋 Showing all users (no team restrictions for chat)');

    if (error) {
      console.error('❌ Supabase error in users:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    console.log('✅ Users retrieved:', users?.length || 0);
    console.log('📊 Sample user data:', users?.[0] ? { 
      id: users[0].id, 
      name: users[0].full_name,
      team: users[0].team,
      role: users[0].role 
    } : 'No users');
    
    res.json({ 
      success: true, 
      data: users || [], 
      message: 'Users retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Server error in users:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Create new user (admin only)
router.post('/', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    console.log('👤 POST /api/users - Creating new user:', req.body);
    const { email, full_name, password, role, department, phone, branch_id } = req.body;

    // Validate required fields
    if (!email || !full_name || !password || !department) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, full_name, password, and department are required' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Validate branch_id if provided
    if (branch_id) {
      const { data: branch, error: branchError } = await supabase
        .from('office_locations')
        .select('id, name')
        .eq('id', branch_id)
        .eq('is_active', true)
        .single();

      if (branchError || !branch) {
        return res.status(400).json({ 
          error: 'Invalid branch selected' 
        });
      }
    }

    // Generate a UUID for the new user
    const newUserId = uuidv4();

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Create profile with hashed password and branch
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name,
        password_hash,
        role: role || 'employee',
        department,
        phone,
        team: department, // Keep team in sync with department for backwards compatibility
        branch_id,
        is_active: true
      })
      .select('id, email, full_name, role, department, phone, branch_id, is_active, created_at')
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return res.status(400).json({ error: profileError.message });
    }

    console.log('✅ User created successfully:', profile.email);
    res.status(201).json({
      success: true,
      data: profile,
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only see their own profile, unless they're admin/team_lead
    if (req.user.id !== id && !['admin', 'team_lead'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, team, avatar_url, created_at')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'User not found' } 
      });
    }

    res.json({ 
      success: true, 
      data: user, 
      message: 'User retrieved successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update user profile
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, department, phone, role, is_active, branch_id } = req.body;

    // Users can only update their own profile, unless they're admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};
    
    // Anyone can update their own name and phone
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;

    // Only admin can change role, department, active status, and branch
    if (req.user.role === 'admin') {
      if (department !== undefined) {
        updateData.department = department;
        updateData.team = department; // Keep team in sync for backwards compatibility
      }
      if (role !== undefined) updateData.role = role;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (branch_id !== undefined) updateData.branch_id = branch_id;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select('id, email, full_name, role, department, phone, is_active, branch_id, avatar_url')
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true, 
      data: user, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow admin to delete themselves
    if (id === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_OPERATION', message: 'Cannot delete your own account' } 
      });
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: authError.message } 
      });
    }

    // Profile will be deleted automatically via trigger
    res.json({ 
      success: true, 
      data: null, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Change password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Both current and new password are required' }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters' }
      });
    }

    // Get user's current password hash
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (userError || !userData) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userData.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: newPasswordHash })
      .eq('id', req.user.id);

    if (updateError) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'UPDATE_ERROR', message: updateError.message }
      });
    }

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// Admin change user password
router.put('/:id/change-password', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password is required' }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' }
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'UPDATE_ERROR', message: updateError.message }
      });
    }

    res.json({ 
      success: true,
      message: 'User password changed successfully' 
    });
  } catch (error) {
    console.error('❌ Error changing user password:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// Get user statistics
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only see their own stats, unless they're admin/team_lead
    if (req.user.id !== id && !['admin', 'team_lead'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get task statistics
    const { data: taskStats, error: taskError } = await supabase
      .from('tasks')
      .select('status')
      .eq('assigned_to', id);

    if (taskError) {
      return res.status(400).json({ error: taskError.message });
    }

    // Get time logs
    const { data: timeLogs, error: timeError } = await supabase
      .from('time_logs')
      .select('hours_logged')
      .eq('user_id', id);

    if (timeError) {
      return res.status(400).json({ error: timeError.message });
    }

    const totalTasks = taskStats.length;
    const completedTasks = taskStats.filter(task => task.status === 'completed').length;
    const totalHours = timeLogs.reduce((sum, log) => sum + log.hours_logged, 0);

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      totalHours,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get office locations (for branch selection)
router.get('/office-locations', authMiddleware, async (req, res) => {
  try {
    console.log('🏢 GET /api/users/office-locations - Fetching office locations');
    
    const { data: offices, error } = await supabase
      .from('office_locations')
      .select('id, name, latitude, longitude, is_active, cycle_type, cycle_start_day, work_start_time, work_end_time')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Database error fetching offices:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message }
      });
    }

    console.log(`✅ Found ${offices?.length || 0} active office locations:`, 
      offices?.map(o => ({ id: o.id, name: o.name })) || []);

    // If no offices found, ensure default ones are created
    if (!offices || offices.length === 0) {
      console.log('⚠️ No office locations found, creating default ones...');
      
      const defaultOffices = [
        { 
          name: 'DMHCA Delhi Branch', 
          latitude: 28.492361, 
          longitude: 77.163533, 
          radius_meters: 100,
          is_active: true,
          cycle_type: 'calendar',
          cycle_start_day: 1,
          work_start_time: '10:00:00',
          work_end_time: '19:00:00'
        },
        { 
          name: 'DMHCA Hyderabad Branch', 
          latitude: 17.42586, 
          longitude: 78.44508, 
          radius_meters: 100,
          is_active: true,
          cycle_type: 'custom',
          cycle_start_day: 26,
          work_start_time: '10:00:00',
          work_end_time: '19:00:00'
        }
      ];

      const { data: newOffices, error: insertError } = await supabase
        .from('office_locations')
        .insert(defaultOffices)
        .select('id, name, latitude, longitude, is_active, cycle_type, cycle_start_day, work_start_time, work_end_time')
        .order('name');

      if (insertError) {
        console.error('❌ Error creating default offices:', insertError);
        // Return basic data even if insert fails
        return res.json({ 
          success: true,
          data: [
            { id: 1, name: 'DMHCA Delhi Branch' },
            { id: 2, name: 'DMHCA Hyderabad Branch' }
          ],
          message: 'Using fallback office locations' 
        });
      }

      console.log('✅ Created default office locations:', newOffices);
      return res.json({ 
        success: true,
        data: newOffices || [],
        message: 'Office locations retrieved successfully (created defaults)' 
      });
    }

    res.json({ 
      success: true,
      data: offices || [],
      message: 'Office locations retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Error getting office locations:', error);
    
    // Provide fallback data even on server error
    res.json({ 
      success: true,
      data: [
        { id: 1, name: 'DMHCA Delhi Branch' },
        { id: 2, name: 'DMHCA Hyderabad Branch' },
        { id: 3, name: 'DMHCA Head Office' }
      ],
      message: 'Using fallback office locations due to server error'
    });
  }
});

module.exports = router;