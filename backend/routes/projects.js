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
    res.json({ 
      success: true, 
      data: projects || [], 
      message: 'Projects retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Server error in projects:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Create project (all authenticated users can create)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, team, deadline, status } = req.body;

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        team: team || req.user.team || 'General',
        deadline,
        status: status || 'active',
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating project:', error);
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.status(201).json({ 
      success: true, 
      data: project, 
      message: 'Project created successfully' 
    });
  } catch (error) {
    console.error('❌ Server error creating project:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get single project
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    const { data: project, error } = await query;

    if (error || !project) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Project not found' } 
      });
    }

    // Check access permissions
    if (req.user.role !== 'admin' && project.team !== req.user.team) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Access denied' } 
      });
    }

    res.json({ 
      success: true, 
      data: project, 
      message: 'Project retrieved successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update project
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, team, deadline, status } = req.body;
    
    // Check if project exists and user has access
    const { data: existingProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingProject) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Project not found' } 
      });
    }

    if (req.user.role !== 'admin' && existingProject.team !== req.user.team) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Access denied' } 
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (team !== undefined) updateData.team = team;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (status !== undefined) updateData.status = status;
    updateData.updated_at = new Date().toISOString();

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating project:', error);
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true, 
      data: project, 
      message: 'Project updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if project exists and user has access
    const { data: existingProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingProject) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Project not found' } 
      });
    }

    // Only admin or project creator can delete
    if (req.user.role !== 'admin' && existingProject.created_by !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Only admins or project creators can delete projects' } 
      });
    }

    const { error } = await supabase
      .from('projects')
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
      message: 'Project deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;