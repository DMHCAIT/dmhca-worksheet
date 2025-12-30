const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📋 GET /api/tasks - User:', req.user?.email, 'Role:', req.user?.role);
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(name),
        assignee:profiles!assigned_to(full_name, email)
      `);

    // Filter tasks based on role
    if (req.user.role === 'employee') {
      query = query.eq('assigned_to', req.user.id);
      console.log('🔍 Filtering tasks for employee:', req.user.id);
    } else if (req.user.role === 'team_lead') {
      // Team lead sees tasks for their team
      query = query.eq('team', req.user.team);
      console.log('🔍 Filtering tasks by team:', req.user.team);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('❌ Supabase error in tasks:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Tasks retrieved:', tasks?.length || 0);
    res.json({ tasks: tasks || [] });

    res.json({ tasks: tasks || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task (all authenticated users can create)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, project_id, assigned_to, priority, deadline, team } = req.body;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        project_id,
        assigned_to,
        priority: priority || 'medium',
        deadline,
        team,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;