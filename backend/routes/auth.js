const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
  full_name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('employee', 'team_lead', 'admin').default('employee'),
  team: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register user
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error: validationError, value } = registerSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.details[0].message
      });
    }

    const { email, password, full_name, role, team } = value;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password with higher salt rounds for production
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate UUID for user
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();

    // Create user profile directly in database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        full_name,
        role,
        team,
        password_hash: hashedPassword
      })
      .select('id, email, full_name, role, team')
      .single();

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      return res.status(400).json({ error: 'Failed to create user profile' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: profile.id, 
        email: profile.email, 
        role: profile.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: profile,
      token
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error: validationError, value } = loginSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.details[0].message
      });
    }

    const { email, password } = value;

    console.log('🔍 Login attempt for:', email.toLowerCase());

    // Get user from database
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    console.log('📊 Database query result:', { user: user ? 'Found' : 'Not found', error: error?.message });

    if (error || !user) {
      console.log('❌ User not found or error:', error?.message);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team: user.team,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      message: 'User data retrieved successfully',
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        team: req.user.team
      }
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile (alias for /me)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    res.json({
      message: 'User data retrieved successfully',
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        team: req.user.team,
        department: req.user.department
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign(
      { 
        userId: req.user.id, 
        email: req.user.email, 
        role: req.user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;