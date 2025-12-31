const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all conversations for current user (shows all team members)
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userTeam = req.user.team;
    
    console.log('💬 GET /conversations - User:', req.user.email, 'Role:', userRole, 'Team:', userTeam);
    
    // Get all team members (excluding self)
    let usersQuery = supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, team')
      .neq('id', userId);
    
    // Filter by team for non-admin users (only if they have a team)
    if ((userRole === 'employee' || userRole === 'team_lead') && userTeam) {
      usersQuery = usersQuery.eq('team', userTeam);
      console.log('🔍 Filtering conversations by team:', userTeam);
    } else if ((userRole === 'employee' || userRole === 'team_lead') && !userTeam) {
      console.log('⚠️ User has no team, showing all users');
    }
    
    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: usersError.message } 
      });
    }

    console.log('✅ Found', users?.length || 0, 'team members for conversations');

    // Get unread message counts and online status for each user
    const conversationsWithUnread = await Promise.all((users || []).map(async (user) => {
      // Get online status
      const { data: statusData } = await supabase
        .from('user_online_status')
        .select('is_online, last_seen')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Get unread message count
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      return {
        ...user,
        unread_count: count || 0,
        is_online: statusData?.is_online || false,
        last_seen: statusData?.last_seen || null
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
