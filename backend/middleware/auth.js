const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Production auth middleware that validates JWT tokens and fetches user from database
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, team')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token or user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const requireRole = (...roles) => {
  // Flatten roles in case an array was passed (e.g., requireRole(['admin', 'team_lead']))
  const allowedRoles = roles.flat();
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = { authMiddleware, requireRole };