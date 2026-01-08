const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification (internal function)
async function createNotification(userId, type, title, message) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      is_read: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return data;
}

// Check for overdue tasks and create notifications
router.post('/check-overdue-tasks', authMiddleware, async (req, res) => {
  try {
    // Get all tasks that are overdue and not completed
    const { data: overdueTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        deadline,
        assigned_to,
        status,
        assignee:assigned_to(full_name)
      `)
      .lt('deadline', new Date().toISOString())
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    if (tasksError) {
      return res.status(400).json({ error: tasksError.message });
    }

    let notificationsCreated = 0;

    // Create notifications for overdue tasks
    for (const task of overdueTasks) {
      // Check if notification already exists for this overdue task
      const { data: existingNotification, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', task.assigned_to)
        .eq('type', 'task_overdue')
        .eq('message', `Task "${task.title}" is overdue`)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Created within last 24 hours
        .single();

      // Only create notification if one doesn't exist for this task in the last 24 hours
      if (!existingNotification) {
        const notification = await createNotification(
          task.assigned_to,
          'task_overdue',
          'Task Overdue',
          `Task "${task.title}" is overdue`
        );
        
        if (notification) {
          notificationsCreated++;
        }
      }
    }

    res.json({ 
      message: `Checked overdue tasks`,
      overdueTasks: overdueTasks.length,
      notificationsCreated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check for new chat messages and create notifications
router.post('/check-new-messages', authMiddleware, async (req, res) => {
  try {
    // Get unread messages for the current user
    const { data: unreadMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message,
        created_at,
        sender:sender_id(full_name)
      `)
      .eq('receiver_id', req.user.id)
      .eq('is_read', false)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

    if (messagesError) {
      return res.status(400).json({ error: messagesError.message });
    }

    let notificationsCreated = 0;

    // Create notifications for new messages
    for (const message of unreadMessages) {
      // Check if notification already exists for this message
      const { data: existingNotification, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', message.receiver_id)
        .eq('type', 'chat_message')
        .like('message', `%${message.sender.full_name}%`)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Created within last 5 minutes
        .single();

      // Only create notification if one doesn't exist for this sender in the last 5 minutes
      if (!existingNotification) {
        const notification = await createNotification(
          message.receiver_id,
          'chat_message',
          'New Message',
          `New message from ${message.sender.full_name}`
        );
        
        if (notification) {
          notificationsCreated++;
        }
      }
    }

    res.json({ 
      message: `Checked new messages`,
      unreadMessages: unreadMessages.length,
      notificationsCreated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;