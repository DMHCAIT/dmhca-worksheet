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
    res.json({ 
      success: true, 
      data: tasks || [], 
      message: 'Tasks retrieved successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get single task
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(name),
        assignee:profiles!assigned_to(full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !task) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Task not found' } 
      });
    }

    // Check access permissions
    if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Access denied' } 
      });
    }

    res.json({ 
      success: true, 
      data: task, 
      message: 'Task retrieved successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
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
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.status(201).json({ 
      success: true, 
      data: task, 
      message: 'Task created successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, project_id, assigned_to, deadline } = req.body;
    
    // Check if task exists
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingTask) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Task not found' } 
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && existingTask.assigned_to !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'You can only update your own tasks' } 
      });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update({ title, description, status, priority, project_id, assigned_to, deadline })
      .eq('id', id)
      .select(`
        *,
        project:projects(name),
        assignee:profiles!assigned_to(full_name, email)
      `)
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true, 
      data: task, 
      message: 'Task updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if task exists
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingTask) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Task not found' } 
      });
    }

    // Only admin or task creator can delete
    if (req.user.role !== 'admin' && existingTask.created_by !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Only admins or task creators can delete tasks' } 
      });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true, 
      data: null, 
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;