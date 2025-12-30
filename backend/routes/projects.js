const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📊 GET /api/projects - User:', req.user?.email, 'Role:', req.user?.role);
    
    let query = supabase
      .from('projects')
      .select('*');

    // Filter by team if not admin
    if (req.user.role !== 'admin') {
      query = query.eq('team', req.user.team);
      console.log('🔍 Filtering projects by team:', req.user.team);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error('❌ Supabase error in projects:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Projects retrieved:', projects?.length || 0);
    res.json({ projects: projects || [] });
  } catch (error) {
    console.error('❌ Server error in projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post('/', authMiddleware, requireRole('admin', 'team_lead'), async (req, res) => {
  try {
    const { name, description, team, deadline } = req.body;

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        team,
        deadline,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;