const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get subtasks for a projection
router.get('/:projectionId/subtasks', authMiddleware, async (req, res) => {
  try {
    const { projectionId } = req.params;
    
    const { data: subtasks, error } = await supabase
      .from('projection_subtasks')
      .select(`
        *,
        assigned_user:profiles!assigned_to(id, full_name, email, avatar_url),
        creator:profiles!created_by(id, full_name, email)
      `)
      .eq('projection_id', projectionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching projection subtasks:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: subtasks || [],
      message: 'Subtasks retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Server error fetching projection subtasks:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Create a subtask
router.post('/:projectionId/subtasks', authMiddleware, async (req, res) => {
  try {
    const { projectionId } = req.params;
    const {
      title,
      description,
      assigned_to,
      estimated_hours,
      status = 'pending',
      priority = 'medium',
      deadline
    } = req.body;

    const { data: subtask, error } = await supabase
      .from('projection_subtasks')
      .insert({
        projection_id: projectionId,
        title,
        description,
        assigned_to,
        estimated_hours,
        status,
        priority,
        deadline,
        created_by: req.user.id
      })
      .select(`
        *,
        assigned_user:profiles!assigned_to(id, full_name, email, avatar_url),
        creator:profiles!created_by(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating projection subtask:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message } 
      });
    }

    res.status(201).json({ 
      success: true,
      data: subtask,
      message: 'Subtask created successfully' 
    });
  } catch (error) {
    console.error('❌ Server error creating projection subtask:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update a subtask
router.put('/subtasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assigned_to,
      estimated_hours,
      actual_hours,
      status,
      priority,
      deadline,
      completed_at
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours;
    if (actual_hours !== undefined) updateData.actual_hours = actual_hours;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (completed_at !== undefined) updateData.completed_at = completed_at;

    // Auto-set completed_at when status changes to completed
    if (status === 'completed' && !completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: subtask, error } = await supabase
      .from('projection_subtasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assigned_user:profiles!assigned_to(id, full_name, email, avatar_url),
        creator:profiles!created_by(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('❌ Error updating projection subtask:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: subtask,
      message: 'Subtask updated successfully' 
    });
  } catch (error) {
    console.error('❌ Server error updating projection subtask:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Delete a subtask
router.delete('/subtasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('projection_subtasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting projection subtask:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DELETE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      message: 'Subtask deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Server error deleting projection subtask:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get all subtasks assigned to the current user
router.get('/my-subtasks', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log('📋 GET /my-subtasks - User:', req.user.email, 'Role:', userRole, 'ID:', userId);
    
    // If admin, get all subtasks; otherwise only assigned to user
    let query = supabase
      .from('projection_subtasks')
      .select(`
        *,
        assigned_user:profiles!assigned_to(id, full_name, email, avatar_url),
        creator:profiles!created_by(id, full_name, email)
      `);
    
    // Only filter by assigned_to for non-admin users
    if (userRole !== 'admin') {
      query = query.eq('assigned_to', userId);
      console.log('🔍 Filtering subtasks for user:', userId);
    } else {
      console.log('👑 Admin - fetching all subtasks');
    }
    
    const { data: subtasks, error } = await query
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user subtasks:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    console.log('✅ Subtasks retrieved:', subtasks?.length || 0);
    
    res.json({ 
      success: true,
      data: subtasks || [],
      message: 'User subtasks retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Server error fetching user subtasks:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get comments for a subtask
router.get('/subtasks/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('💬 GET /subtasks/:id/comments - Subtask ID:', id, 'User:', req.user.email);

    const { data: comments, error } = await supabase
      .from('projection_subtask_comments')
      .select(`
        *,
        user:profiles!user_id(id, full_name, email, avatar_url)
      `)
      .eq('subtask_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching subtask comments:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    console.log('✅ Subtask comments retrieved:', comments?.length || 0);
    
    res.json({ 
      success: true,
      data: comments || [],
      message: 'Subtask comments retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Server error fetching subtask comments:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Add a comment to a subtask
router.post('/subtasks/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Comment cannot be empty' }
      });
    }

    console.log('💬 POST /subtasks/:id/comments - Subtask ID:', id, 'User:', req.user.email);

    const { data: newComment, error } = await supabase
      .from('projection_subtask_comments')
      .insert({
        subtask_id: id,
        user_id: req.user.id,
        comment: comment.trim()
      })
      .select(`
        *,
        user:profiles!user_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating subtask comment:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message } 
      });
    }

    console.log('✅ Subtask comment created:', newComment.id);

    res.status(201).json({ 
      success: true,
      data: newComment,
      message: 'Comment added successfully' 
    });
  } catch (error) {
    console.error('❌ Server error creating subtask comment:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update a subtask comment
router.put('/subtasks/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Comment cannot be empty' }
      });
    }

    console.log('💬 PUT /subtasks/:id/comments/:commentId - Comment ID:', commentId, 'User:', req.user.email);

    const { data: updatedComment, error } = await supabase
      .from('projection_subtask_comments')
      .update({
        comment: comment.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('subtask_id', id)
      .select(`
        *,
        user:profiles!user_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) {
      console.error('❌ Error updating subtask comment:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message } 
      });
    }

    if (!updatedComment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Comment not found or permission denied' }
      });
    }

    console.log('✅ Subtask comment updated:', updatedComment.id);

    res.json({ 
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully' 
    });
  } catch (error) {
    console.error('❌ Server error updating subtask comment:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Delete a subtask comment
router.delete('/subtasks/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { id, commentId } = req.params;

    console.log('💬 DELETE /subtasks/:id/comments/:commentId - Comment ID:', commentId, 'User:', req.user.email);

    const { error } = await supabase
      .from('projection_subtask_comments')
      .delete()
      .eq('id', commentId)
      .eq('subtask_id', id);

    if (error) {
      console.error('❌ Error deleting subtask comment:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DELETE_ERROR', message: error.message } 
      });
    }

    console.log('✅ Subtask comment deleted:', commentId);

    res.json({ 
      success: true,
      message: 'Comment deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Server error deleting subtask comment:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;
