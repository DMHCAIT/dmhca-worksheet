const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get work projections
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📈 GET /api/projections - User:', req.user?.email, 'Role:', req.user?.role);
    
    let query = supabase
      .from('work_projections')
      .select('*');

    // Filter based on role
    if (req.user.role === 'employee') {
      query = query.eq('user_id', req.user.id);
      console.log('🔍 Filtering projections for employee:', req.user.id);
    } else if (req.user.role === 'team_lead') {
      query = query.eq('team', req.user.team);
      console.log('🔍 Filtering projections by team:', req.user.team);
    }

    const { data: projections, error } = await query;

    if (error) {
      console.error('❌ Supabase error in projections:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Projections retrieved:', projections?.length || 0);
    res.json({ 
      success: true,
      data: projections || [], 
      message: 'Projections retrieved successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Create work projection
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      week_start, 
      week_end, 
      planned_hours, 
      goals,
      // Support frontend field names
      week_start_date,
      week_end_date,
      project_id,
      estimated_hours,
      notes,
      status = 'draft'
    } = req.body;

    const { data: projection, error } = await supabase
      .from('work_projections')
      .insert({
        title: title || `Week ${week_start_date || week_start}`,
        description: description || notes || '',
        week_start: week_start_date || week_start,
        week_end: week_end_date || week_end,
        planned_hours: estimated_hours || planned_hours || 0,
        goals: goals || null,
        status,
        user_id: req.user.id,
        team: req.user.team || 'General'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating projection:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message } 
      });
    }

    res.status(201).json({ 
      success: true,
      data: projection,
      message: 'Projection created successfully' 
    });
  } catch (error) {
    console.error('❌ Server error creating projection:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update work projection
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      week_start, 
      week_end, 
      planned_hours, 
      actual_hours,
      goals,
      status,
      notes,
      week_start_date,
      week_end_date,
      estimated_hours
    } = req.body;

    const updateData = {
      title: title || updateData?.title,
      description: description || notes,
      week_start: week_start_date || week_start,
      week_end: week_end_date || week_end,
      planned_hours: estimated_hours || planned_hours,
      actual_hours,
      goals,
      status,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const { data: projection, error } = await supabase
      .from('work_projections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating projection:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: projection,
      message: 'Projection updated successfully' 
    });
  } catch (error) {
    console.error('❌ Server error updating projection:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Delete work projection
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('work_projections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting projection:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DELETE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      message: 'Projection deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Server error deleting projection:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;