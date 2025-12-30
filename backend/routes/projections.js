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
    res.json({ projections: projections || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create work projection
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, week_start, week_end, planned_hours, goals } = req.body;

    const { data: projection, error } = await supabase
      .from('work_projections')
      .insert({
        title,
        description,
        week_start,
        week_end,
        planned_hours,
        goals,
        user_id: req.user.id,
        team: req.user.team
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(projection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;