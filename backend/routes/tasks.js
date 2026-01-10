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
        assignee:profiles!assigned_to(full_name, email),
        creator:profiles!created_by(full_name, email)
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
        assignee:profiles!assigned_to(full_name, email),
        creator:profiles!created_by(full_name, email)
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

    // Get comments
    const { data: comments } = await supabase
      .from('task_comments')
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: true });

    // Get attachments
    const { data: attachments } = await supabase
      .from('task_attachments')
      .select(`
        *,
        uploader:profiles!uploaded_by(full_name, email)
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    res.json({ 
      success: true, 
      data: {
        ...task,
        comments: comments || [],
        attachments: attachments || []
      }, 
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
        team: team || req.user.team || 'general',
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

    // Create notification for the assigned user (if not self-assigned)
    if (assigned_to && assigned_to !== req.user.id) {
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: assigned_to,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned a new task: "${title}"`,
            related_id: task.id,
            related_type: 'task',
            is_read: false
          });
        
        console.log('✅ Task assignment notification created');
      } catch (notificationError) {
        console.error('Failed to create task assignment notification:', notificationError);
        // Don't fail the task creation if notification fails
      }
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

    // Create notifications for task updates
    try {
      // Collect participants to notify
      const participants = new Set();
      
      if (existingTask.assigned_to && existingTask.assigned_to !== req.user.id) {
        participants.add(existingTask.assigned_to);
      }
      if (existingTask.created_by && existingTask.created_by !== req.user.id) {
        participants.add(existingTask.created_by);
      }

      // Check for status change and create appropriate notifications
      if (status && status !== existingTask.status) {
        let notificationType = 'task_updated';
        let notificationTitle = 'Task Updated';
        let notificationMessage = `Task "${existingTask.title}" status changed to: ${status}`;

        if (status === 'completed') {
          notificationType = 'task_completed';
          notificationTitle = 'Task Completed';
          notificationMessage = `Task "${existingTask.title}" has been completed by ${req.user.full_name}`;
        } else if (status === 'in_progress') {
          notificationMessage = `Task "${existingTask.title}" is now in progress`;
        }

        // Create notifications for participants
        for (const userId of participants) {
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              type: notificationType,
              title: notificationTitle,
              message: notificationMessage,
              related_id: id,
              related_type: 'task',
              is_read: false
            });
        }
      }

      // Check for assignment change
      if (assigned_to && assigned_to !== existingTask.assigned_to) {
        // Notify new assignee
        if (assigned_to !== req.user.id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: assigned_to,
              type: 'task_assigned',
              title: 'Task Reassigned',
              message: `You have been assigned task: "${existingTask.title}"`,
              related_id: id,
              related_type: 'task',
              is_read: false
            });
        }

        // Notify old assignee (if different from updater)
        if (existingTask.assigned_to && existingTask.assigned_to !== req.user.id && existingTask.assigned_to !== assigned_to) {
          await supabase
            .from('notifications')
            .insert({
              user_id: existingTask.assigned_to,
              type: 'task_updated',
              title: 'Task Reassigned',
              message: `Task "${existingTask.title}" has been reassigned`,
              related_id: id,
              related_type: 'task',
              is_read: false
            });
        }
      }

      console.log('✅ Task update notifications created');
    } catch (notificationError) {
      console.error('Failed to create task update notifications:', notificationError);
      // Don't fail the task update if notification fails
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

// Add comment to task
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Comment is required' } 
      });
    }

    // Check if task exists
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .single();

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Task not found' } 
      });
    }

    const { data: newComment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: id,
        user_id: req.user.id,
        comment
      })
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.status(201).json({ 
      success: true, 
      data: newComment, 
      message: 'Comment added successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Add attachment to task
router.post('/:id/attachments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { file_name, file_url, file_size } = req.body;

    if (!file_name || !file_url) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'File name and URL are required' } 
      });
    }

    // Check if task exists
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .single();

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Task not found' } 
      });
    }

    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: id,
        file_name,
        file_url,
        file_size,
        uploaded_by: req.user.id
      })
      .select(`
        *,
        uploader:profiles!uploaded_by(full_name, email)
      `)
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.status(201).json({ 
      success: true, 
      data: attachment, 
      message: 'Attachment added successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Delete attachment
router.delete('/:taskId/attachments/:attachmentId', authMiddleware, async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;

    // Check if attachment exists and belongs to task
    const { data: attachment } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .single();

    if (!attachment) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Attachment not found' } 
      });
    }

    // Only uploader or admin can delete
    if (req.user.role !== 'admin' && attachment.uploaded_by !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Only uploaders or admins can delete attachments' } 
      });
    }

    const { error } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true, 
      data: null, 
      message: 'Attachment deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;