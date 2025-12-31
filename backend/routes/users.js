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
    
    // Select all user fields
    // NO TEAM FILTERING - All users can see all users for chat functionality
    const query = supabase
      .from('profiles')
      .select('id, email, full_name, role, team, avatar_url, created_at, updated_at');

    console.log('📋 Showing all users (no team restrictions for chat)');

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Supabase error in users:', error);
      return res.status(400).json({ error: error.message });
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
    const { email, full_name, password, role, team } = req.body;

    // Validate required fields
    if (!email || !full_name || !password || !team) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, full_name, password, and team are required' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Generate a UUID for the new user
    const newUserId = uuidv4();

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Create profile with hashed password
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name,
        password_hash,
        role: role || 'employee',
        team
      })
      .select('id, email, full_name, role, team, created_at')
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
    const { full_name, team, role } = req.body;

    // Users can only update their own profile, unless they're admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};
    
    // Anyone can update their own name
    if (full_name !== undefined) updateData.full_name = full_name;

    // Only admin can change role and team
    if (req.user.role === 'admin') {
      if (team !== undefined) updateData.team = team;
      if (role !== undefined) updateData.role = role;
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select('id, email, full_name, role, team, avatar_url')
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

module.exports = router;