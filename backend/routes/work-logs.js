const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get today's work log for current user
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_work_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('log_date', today)
      .limit(1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({
      success: true,
      data: data && data.length > 0 ? data[0] : null,
      message: data && data.length > 0 ? 'Work log found' : 'No work log for today'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Create or update today's work log
router.post('/today', authMiddleware, async (req, res) => {
  try {
    const { work_description, tasks_completed, hours_worked, challenges, achievements } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Check if log already exists for today
    const { data: existing, error: checkError } = await supabase
      .from('daily_work_logs')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('log_date', today)
      .limit(1);

    if (checkError) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: checkError.message } 
      });
    }

    let result;
    if (existing && existing.length > 0) {
      // Update existing log
      const { data, error } = await supabase
        .from('daily_work_logs')
        .update({
          work_description,
          tasks_completed,
          hours_worked,
          challenges,
          achievements,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id)
        .select()
        .limit(1);

      if (error) throw error;
      result = data && data.length > 0 ? data[0] : null;
    } else {
      // Create new log
      const { data, error } = await supabase
        .from('daily_work_logs')
        .insert({
          user_id: req.user.id,
          log_date: today,
          work_description,
          tasks_completed,
          hours_worked,
          challenges,
          achievements,
          status: 'submitted'
        })
        .select()
        .limit(1);

      if (error) throw error;
      result = data && data.length > 0 ? data[0] : null;
    }

    res.json({
      success: true,
      data: result,
      message: 'Work log saved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get work logs for a date range
router.get('/range', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;

    let query = supabase
      .from('daily_work_logs')
      .select(`
        *,
        user:profiles!daily_work_logs_user_id_fkey(id, full_name, email, team, department)
      `)
      .gte('log_date', start_date)
      .lte('log_date', end_date)
      .order('log_date', { ascending: false });

    // Apply filters based on role
    if (req.user.role === 'employee') {
      query = query.eq('user_id', req.user.id);
    } else if (req.user.role === 'team_lead') {
      // Team lead sees their team's logs
      const { data: teamUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('team', req.user.team);
      
      const userIds = teamUsers ? teamUsers.map(u => u.id) : [req.user.id];
      query = query.in('user_id', userIds);
    } else if (user_id && req.user.role === 'admin') {
      // Admin can filter by specific user
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({
      success: true,
      data: data || [],
      message: 'Work logs retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get weekly report (Monday to Saturday)
router.get('/weekly-report', authMiddleware, async (req, res) => {
  try {
    const { week_start, user_id } = req.query;
    
    if (!week_start) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'week_start is required' } 
      });
    }

    // Calculate week end (Saturday)
    const startDate = new Date(week_start);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 5); // Monday to Saturday = 6 days

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    // Determine user to report on
    let targetUserId = req.user.id;
    if (user_id && (req.user.role === 'admin' || req.user.role === 'team_lead')) {
      targetUserId = user_id;
    }

    // Get work logs for the week
    const { data: workLogs, error: logsError } = await supabase
      .from('daily_work_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('log_date', start)
      .lte('log_date', end)
      .order('log_date', { ascending: true });

    if (logsError) throw logsError;

    // Get tasks for the week
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, created_at, completed_at')
      .eq('assigned_to', targetUserId)
      .or(`created_at.gte.${start}T00:00:00,completed_at.gte.${start}T00:00:00`)
      .or(`created_at.lte.${end}T23:59:59,completed_at.lte.${end}T23:59:59`);

    // Get subtasks for the week
    const { data: subtasks, error: subtasksError } = await supabase
      .from('projection_subtasks')
      .select('id, title, status, estimated_hours, actual_hours, created_at')
      .eq('assigned_to', targetUserId)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`);

    // Get user info
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, full_name, email, team, department, role')
      .eq('id', targetUserId)
      .limit(1);

    const user = userData && userData.length > 0 ? userData[0] : null;

    // Calculate statistics
    const tasksReceived = (tasks || []).filter(t => 
      new Date(t.created_at) >= startDate && new Date(t.created_at) <= endDate
    ).length;

    const tasksCompleted = (tasks || []).filter(t => 
      t.status === 'completed' && t.completed_at &&
      new Date(t.completed_at) >= startDate && new Date(t.completed_at) <= endDate
    ).length;

    const subtasksCompleted = (subtasks || []).filter(st => st.status === 'completed').length;
    const totalHours = (workLogs || []).reduce((sum, log) => sum + parseFloat(log.hours_worked || 0), 0);
    const totalSubtaskHours = (subtasks || []).reduce((sum, st) => sum + parseFloat(st.actual_hours || 0), 0);

    res.json({
      success: true,
      data: {
        period: {
          start: start,
          end: end,
          type: 'weekly'
        },
        user: user,
        summary: {
          tasks_received: tasksReceived,
          tasks_completed: tasksCompleted,
          subtasks_completed: subtasksCompleted,
          total_work_items: tasksReceived + (subtasks || []).length,
          completion_rate: tasksReceived > 0 ? Math.round((tasksCompleted / tasksReceived) * 100) : 0,
          total_hours: totalHours + totalSubtaskHours,
          work_log_hours: totalHours,
          subtask_hours: totalSubtaskHours,
          days_logged: (workLogs || []).length
        },
        work_logs: workLogs || [],
        tasks: tasks || [],
        subtasks: subtasks || []
      },
      message: 'Weekly report generated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get monthly report (1st to last day of month)
router.get('/monthly-report', authMiddleware, async (req, res) => {
  try {
    const { year, month, user_id } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'year and month are required' } 
      });
    }

    // Calculate month range
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    // Determine user to report on
    let targetUserId = req.user.id;
    if (user_id && (req.user.role === 'admin' || req.user.role === 'team_lead')) {
      targetUserId = user_id;
    }

    // Get work logs for the month
    const { data: workLogs, error: logsError } = await supabase
      .from('daily_work_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('log_date', start)
      .lte('log_date', end)
      .order('log_date', { ascending: true });

    if (logsError) throw logsError;

    // Get tasks for the month
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, created_at, completed_at')
      .eq('assigned_to', targetUserId)
      .or(`created_at.gte.${start}T00:00:00,completed_at.gte.${start}T00:00:00`)
      .or(`created_at.lte.${end}T23:59:59,completed_at.lte.${end}T23:59:59`);

    // Get subtasks for the month
    const { data: subtasks, error: subtasksError } = await supabase
      .from('projection_subtasks')
      .select('id, title, status, estimated_hours, actual_hours, created_at')
      .eq('assigned_to', targetUserId)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`);

    // Get user info
    const { data: userData } = await supabase
      .from('profiles')
      .select('id, full_name, email, team, department, role')
      .eq('id', targetUserId)
      .limit(1);

    const user = userData && userData.length > 0 ? userData[0] : null;

    // Calculate statistics
    const tasksReceived = (tasks || []).filter(t => 
      new Date(t.created_at) >= startDate && new Date(t.created_at) <= endDate
    ).length;

    const tasksCompleted = (tasks || []).filter(t => 
      t.status === 'completed' && t.completed_at &&
      new Date(t.completed_at) >= startDate && new Date(t.completed_at) <= endDate
    ).length;

    const subtasksCompleted = (subtasks || []).filter(st => st.status === 'completed').length;
    const totalHours = (workLogs || []).reduce((sum, log) => sum + parseFloat(log.hours_worked || 0), 0);
    const totalSubtaskHours = (subtasks || []).reduce((sum, st) => sum + parseFloat(st.actual_hours || 0), 0);

    // Weekly breakdown
    const weeklyBreakdown = [];
    let currentWeekStart = new Date(startDate);
    while (currentWeekStart <= endDate) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

      const weekLogs = (workLogs || []).filter(log => {
        const logDate = new Date(log.log_date);
        return logDate >= currentWeekStart && logDate <= weekEnd;
      });

      weeklyBreakdown.push({
        week_start: currentWeekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        days_logged: weekLogs.length,
        hours: weekLogs.reduce((sum, log) => sum + parseFloat(log.hours_worked || 0), 0)
      });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    res.json({
      success: true,
      data: {
        period: {
          year: parseInt(year),
          month: parseInt(month),
          start: start,
          end: end,
          type: 'monthly'
        },
        user: user,
        summary: {
          tasks_received: tasksReceived,
          tasks_completed: tasksCompleted,
          subtasks_completed: subtasksCompleted,
          total_work_items: tasksReceived + (subtasks || []).length,
          completion_rate: tasksReceived > 0 ? Math.round((tasksCompleted / tasksReceived) * 100) : 0,
          total_hours: totalHours + totalSubtaskHours,
          work_log_hours: totalHours,
          subtask_hours: totalSubtaskHours,
          days_logged: (workLogs || []).length,
          total_days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
        },
        weekly_breakdown: weeklyBreakdown,
        work_logs: workLogs || [],
        tasks: tasks || [],
        subtasks: subtasks || []
      },
      message: 'Monthly report generated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;
