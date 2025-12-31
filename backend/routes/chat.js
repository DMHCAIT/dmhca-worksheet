const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all conversations for current user (list of users they've chatted with)
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get unique users the current user has conversed with
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching conversations:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    // Get unique user IDs
    const userIds = new Set();
    messages.forEach(msg => {
      if (msg.sender_id !== userId) userIds.add(msg.sender_id);
      if (msg.receiver_id !== userId) userIds.add(msg.receiver_id);
    });

    // Get user details and online status
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        avatar_url,
        role,
        team,
        user_online_status(is_online, last_seen)
      `)
      .in('id', Array.from(userIds));

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    }

    // Get unread message counts for each conversation
    const conversationsWithUnread = await Promise.all((users || []).map(async (user) => {
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      return {
        ...user,
        unread_count: count || 0,
        is_online: user.user_online_status?.[0]?.is_online || false,
        last_seen: user.user_online_status?.[0]?.last_seen || null
      };
    }));

    res.json({ 
      success: true,
      data: conversationsWithUnread,
      message: 'Conversations retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Server error fetching conversations:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get messages between current user and another user
router.get('/messages/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;
    
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, avatar_url),
        receiver:profiles!receiver_id(id, full_name, avatar_url)
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching messages:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    // Mark messages as read
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    res.json({ 
      success: true,
      data: messages || [],
      message: 'Messages retrieved successfully' 
    });
  } catch (error) {
    console.error('❌ Server error fetching messages:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Send a message
router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, message } = req.body;

    if (!receiver_id || !message) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'receiver_id and message are required' } 
      });
    }

    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id,
        message,
        is_read: false
      })
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, avatar_url),
        receiver:profiles!receiver_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('❌ Error sending message:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: newMessage,
      message: 'Message sent successfully' 
    });
  } catch (error) {
    console.error('❌ Server error sending message:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update online status
router.post('/status/online', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Upsert online status
    const { data, error } = await supabase
      .from('user_online_status')
      .upsert({
        user_id: userId,
        is_online: true,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating online status:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data,
      message: 'Online status updated' 
    });
  } catch (error) {
    console.error('❌ Server error updating status:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Update offline status
router.post('/status/offline', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_online_status')
      .upsert({
        user_id: userId,
        is_online: false,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating offline status:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data,
      message: 'Offline status updated' 
    });
  } catch (error) {
    console.error('❌ Server error updating status:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get unread message count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error fetching unread count:', error);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    res.json({ 
      success: true,
      data: { unread_count: count || 0 },
      message: 'Unread count retrieved' 
    });
  } catch (error) {
    console.error('❌ Server error fetching unread count:', error);
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;
