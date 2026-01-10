const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Store active SSE connections
const connections = new Map();

// Custom auth middleware for SSE that accepts token via query param
const sseAuth = async (req, res, next) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.error('❌ SSE Auth: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 SSE Auth: Token decoded:', { userId: decoded.userId || decoded.id, email: decoded.email });
    
    // Handle both userId and id fields (for compatibility)
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.error('❌ SSE Auth: No user ID in token');
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    // Get user from your user store/database
    const supabase = require('../config/supabase');
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('❌ SSE Auth: User not found:', error?.message || 'No user data');
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('✅ SSE Auth successful for user:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ SSE Auth error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// SSE endpoint for real-time notifications
router.get('/stream', sseAuth, (req, res) => {
  console.log('🌊 New SSE connection for user:', req.user.email);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store connection
  const userId = req.user.id;
  connections.set(userId, res);

  // Send initial connection message
  res.write('data: {"type":"connected","message":"Notification stream connected"}\n\n');

  // Handle connection close
  const cleanup = () => {
    console.log('🌊 SSE connection closed for user:', req.user.email);
    connections.delete(userId);
    if (heartbeat) clearInterval(heartbeat);
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    if (connections.has(userId)) {
      try {
        res.write('data: {"type":"heartbeat"}\n\n');
      } catch (error) {
        console.error('❌ SSE heartbeat failed:', error);
        cleanup();
      }
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // 30 seconds
});

// Function to send notification to specific user
function sendNotificationToUser(userId, notification) {
  const connection = connections.get(userId);
  if (connection) {
    try {
      const data = JSON.stringify({
        type: 'notification',
        notification: notification
      });
      connection.write(`data: ${data}\n\n`);
      console.log('🔔 Sent real-time notification to user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send notification via SSE:', error);
      connections.delete(userId);
      return false;
    }
  }
  return false;
}

// Function to broadcast to all connected users
function broadcastNotification(notification) {
  let sentCount = 0;
  for (const [userId, connection] of connections) {
    if (sendNotificationToUser(userId, notification)) {
      sentCount++;
    }
  }
  console.log(`📡 Broadcasted notification to ${sentCount} connected users`);
  return sentCount;
}

// Export functions for use in other routes
module.exports = router;
module.exports.sendNotificationToUser = sendNotificationToUser;
module.exports.broadcastNotification = broadcastNotification;
module.exports.getActiveConnections = () => connections.size;