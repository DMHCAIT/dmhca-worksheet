const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { sendNotificationToUser } = require('./sse');

const router = express.Router();

// Get user notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📋 GET /api/notifications - User:', req.user?.email);
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    // If 'since' parameter is provided, filter notifications created after that timestamp
    if (req.query.since) {
      query = query.gt('created_at', req.query.since);
      console.log('📅 Filtering notifications since:', req.query.since);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('❌ Notification fetch error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Notifications retrieved:', notifications?.length || 0);
    
    // If 'since' was provided and no new notifications, return 304 Not Modified
    if (req.query.since && (!notifications || notifications.length === 0)) {
      return res.status(304).end();
    }

    res.json(notifications || []);
  } catch (error) {
    console.error('❌ Server error in notifications:', error);
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

// Enhanced notification creation with better error handling
async function createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
  try {
    console.log(`🔔 Creating notification: ${type} for user ${userId}`);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        related_id: relatedId,
        related_type: relatedType,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating notification:', error);
      return null;
    }

    console.log('✅ Notification created successfully:', data.id);
    
    // Send real-time notification via SSE
    try {
      const sent = sendNotificationToUser(userId, data);
      if (sent) {
        console.log('🌊 Real-time notification sent via SSE');
      }
    } catch (sseError) {
      console.error('⚠️ SSE delivery failed (user may not be connected):', sseError.message);
    }

    return data;
  } catch (error) {
    console.error('❌ Notification creation failed:', error);
    return null;
  }
}

// Notify all users involved in a task (assignee, creator, commenters)
async function notifyTaskParticipants(taskId, excludeUserId, type, title, message) {
  try {
    // Get task details and participants
    const { data: task } = await supabase
      .from('tasks')
      .select('assigned_to, created_by')
      .eq('id', taskId)
      .single();

    if (!task) return;

    // Get unique commenters
    const { data: comments } = await supabase
      .from('task_comments')
      .select('user_id')
      .eq('task_id', taskId);

    // Collect all unique participants
    const participants = new Set();
    if (task.assigned_to && task.assigned_to !== excludeUserId) {
      participants.add(task.assigned_to);
    }
    if (task.created_by && task.created_by !== excludeUserId) {
      participants.add(task.created_by);
    }
    if (comments) {
      comments.forEach(comment => {
        if (comment.user_id !== excludeUserId) {
          participants.add(comment.user_id);
        }
      });
    }

    // Create notifications for all participants
    const notifications = [];
    for (const userId of participants) {
      const notification = await createNotification(userId, type, title, message, taskId, 'task');
      if (notification) notifications.push(notification);
    }

    console.log(`📨 Created ${notifications.length} notifications for task ${taskId}`);
    return notifications;
  } catch (error) {
    console.error('❌ Error notifying task participants:', error);
    return [];
  }
}

// Export notification helpers for use in other routes
module.exports.createNotification = createNotification;
module.exports.notifyTaskParticipants = notifyTaskParticipants;

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

// Create notification for task creation
router.post('/task-created', authMiddleware, async (req, res) => {
  try {
    const { taskId, assignedTo, taskTitle } = req.body;
    
    if (assignedTo && assignedTo !== req.user.id) {
      const notification = await createNotification(
        assignedTo,
        'task_assigned',
        'New Task Assigned',
        `You have been assigned a new task: "${taskTitle}"`,
        taskId,
        'task'
      );
      
      res.json({ success: true, notification });
    } else {
      res.json({ success: true, message: 'No notification needed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification for comments
router.post('/comment-added', authMiddleware, async (req, res) => {
  try {
    const { taskId, taskTitle, commentText } = req.body;
    
    const notifications = await notifyTaskParticipants(
      taskId,
      req.user.id,
      'comment_added',
      'New Comment on Task',
      `${req.user.full_name} commented on "${taskTitle}": ${commentText.substring(0, 50)}...`
    );
    
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification for task status updates
router.post('/task-updated', authMiddleware, async (req, res) => {
  try {
    const { taskId, taskTitle, updateType, newStatus } = req.body;
    
    let message = '';
    let notificationType = 'task_updated';
    
    switch (updateType) {
      case 'status':
        message = `Task "${taskTitle}" status updated to: ${newStatus}`;
        if (newStatus === 'completed') {
          notificationType = 'task_completed';
          message = `Task "${taskTitle}" has been completed`;
        }
        break;
      case 'review':
        notificationType = 'review_written';
        message = `${req.user.full_name} wrote a review for task "${taskTitle}"`;
        break;
      default:
        message = `Task "${taskTitle}" has been updated`;
    }
    
    const notifications = await notifyTaskParticipants(
      taskId,
      req.user.id,
      notificationType,
      'Task Update',
      message
    );
    
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a test notification
router.post('/test', authMiddleware, async (req, res) => {
  try {
    console.log('🧪 Creating test notification for user:', req.user.id);
    
    const testNotification = await createNotification(
      req.user.id,
      'test',
      'Test Notification',
      'This is a test notification to verify the system is working'
    );
    
    if (testNotification) {
      console.log('✅ Test notification created:', testNotification);
      res.json({ 
        success: true, 
        notification: testNotification,
        message: 'Test notification created successfully' 
      });
    } else {
      res.status(400).json({ error: 'Failed to create test notification' });
    }
  } catch (error) {
    console.error('❌ Test notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;