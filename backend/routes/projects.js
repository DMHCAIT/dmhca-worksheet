const express = require('express');
const supabase = require('../config/supabase');
const multer = require('multer');
const path = require('path');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for project attachments
    cb(null, true);
  }
});

// Get all projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📊 GET /api/projects - User:', req.user?.email, 'Role:', req.user?.role);
    
    // Get projects user has access to:
    // 1. Projects in user's team (if not admin)
    // 2. Projects where user is a member
    // 3. All projects (if admin)
    
    let projectIds = new Set();
    
    if (req.user.role === 'admin') {
      // Admin can see all projects
      const { data: allProjects, error: allError } = await supabase
        .from('projects')
        .select('id');
      
      if (allError) {
        console.error('❌ Supabase error fetching all projects:', allError);
        return res.status(400).json({ error: allError.message });
      }
      
      allProjects?.forEach(p => projectIds.add(p.id));
    } else {
      // Get projects from user's team
      const { data: teamProjects, error: teamError } = await supabase
        .from('projects')
        .select('id')
        .eq('team', req.user.team);
      
      if (teamError) {
        console.error('❌ Supabase error fetching team projects:', teamError);
        return res.status(400).json({ error: teamError.message });
      }
      
      teamProjects?.forEach(p => projectIds.add(p.id));
      
      // Also get projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', req.user.id);
      
      if (memberError) {
        console.error('❌ Supabase error fetching member projects:', memberError);
        return res.status(400).json({ error: memberError.message });
      }
      
      memberProjects?.forEach(p => projectIds.add(p.project_id));
    }
    
    // Convert Set to Array
    const accessibleProjectIds = Array.from(projectIds);
    
    if (accessibleProjectIds.length === 0) {
      return res.json({ 
        success: true, 
        data: [], 
        message: 'No accessible projects found' 
      });
    }
    
    // Fetch the actual project data
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .in('id', accessibleProjectIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error in projects:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Projects retrieved: ${projects?.length || 0} (team + member projects)`);
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
    const hasAccess = (
      req.user.role === 'admin' || 
      project.team === req.user.team ||
      project.created_by === req.user.id
    );

    if (!hasAccess) {
      // Check if user is a project member
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', req.user.id)
        .single();
      
      if (!membership) {
        return res.status(403).json({ 
          success: false, 
          error: { code: 'FORBIDDEN', message: 'Access denied' } 
        });
      }
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

// =================== PROJECT ATTACHMENTS ROUTES ===================

// Get project attachments
router.get('/:projectId/attachments', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if user has access to project
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    // Check access permissions
    const hasAccess = (
      req.user.role === 'admin' || 
      project.team === req.user.team ||
      project.created_by === req.user.id
    );

    if (!hasAccess) {
      // Check if user is a project member
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', req.user.id)
        .single();
      
      if (!membership) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }
    }

    const { data: attachments, error } = await supabase
      .from('project_attachments')
      .select(`
        id,
        project_id,
        file_name,
        file_url,
        file_size,
        file_type,
        uploaded_by,
        description,
        created_at,
        profiles!project_attachments_uploaded_by_fkey (
          full_name
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message }
      });
    }

    res.json({
      success: true,
      data: attachments || [],
      message: 'Project attachments retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// Upload project attachment
router.post('/:projectId/attachments', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const file = req.file;

    console.log('🎯 POST /api/projects/:projectId/attachments');
    console.log('📊 Upload request:', { projectId, hasFile: !!file, fileName: file?.originalname });
    console.log('👤 User:', req.user?.email, 'Role:', req.user?.role);

    if (!file) {
      console.log('❌ No file provided');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' }
      });
    }

    // Check if user has access to project
    console.log('🔍 Checking project access...');
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    // Check upload permissions
    const hasAccess = (
      req.user.role === 'admin' || 
      project.team === req.user.team ||
      project.created_by === req.user.id
    );

    if (!hasAccess) {
      // Check if user is a project member
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', req.user.id)
        .single();
      
      if (!membership) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }
    }

    // Upload file to Supabase Storage
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
    const filePath = `project-attachments/${projectId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: uploadError.message }
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content')
      .getPublicUrl(filePath);

    // Save attachment record to database
    const { data: attachment, error: dbError } = await supabase
      .from('project_attachments')
      .insert({
        project_id: parseInt(projectId),
        file_name: file.originalname,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.mimetype,
        uploaded_by: req.user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('content').remove([filePath]);
      
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: dbError.message }
      });
    }

    res.status(201).json({
      success: true,
      data: attachment,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// Delete project attachment
router.delete('/:projectId/attachments/:attachmentId', authMiddleware, async (req, res) => {
  try {
    const { projectId, attachmentId } = req.params;

    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('project_attachments')
      .select('*, projects(*)')
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !attachment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found' }
      });
    }

    // Check delete permissions - only uploader, admin, or project team members can delete
    if (
      req.user.role !== 'admin' && 
      attachment.uploaded_by !== req.user.id &&
      attachment.projects.team !== req.user.team
    ) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
    }

    // Delete file from storage
    const urlParts = attachment.file_url.split('/');
    const filePath = urlParts.slice(-3).join('/'); // Get last 3 parts: project-attachments/projectId/filename
    
    await supabase.storage
      .from('content')
      .remove([filePath]);

    // Delete database record
    const { error: deleteError } = await supabase
      .from('project_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: deleteError.message }
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

// =================== PROJECT MEMBERS ROUTES ===================

// Get project members
router.get('/:projectId/members', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if user has access to project
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    // Check access permissions
    const hasAccess = (
      req.user.role === 'admin' || 
      project.team === req.user.team ||
      project.created_by === req.user.id
    );

    if (!hasAccess) {
      // Check if user is a project member
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', req.user.id)
        .single();
      
      if (!membership) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }
    }

    // Get project members
    const { data: members, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching members:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message }
      });
    }

    // Get user details for each member
    const membersWithUsers = [];
    if (members && members.length > 0) {
      for (const member of members) {
        const { data: user } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('id', member.user_id)
          .single();
        
        membersWithUsers.push({
          ...member,
          user: user || null
        });
      }
    }

    res.json({
      success: true,
      data: membersWithUsers || [],
      message: 'Project members retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// Add project member
router.post('/:projectId/members', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role = 'member' } = req.body;

    console.log('🎯 POST /api/projects/:projectId/members');
    console.log('📊 Request data:', { projectId, userId, role, body: req.body });
    console.log('👤 User:', req.user?.email, 'Role:', req.user?.role);

    if (!userId) {
      console.log('❌ Validation error: userId is missing');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userId is required' }
      });
    }

    // Check if user has access to project
    console.log('🔍 Checking project access...');
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      console.log('❌ Project not found:', projectId);
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    console.log('📋 Project found:', { id: project.id, name: project.name, created_by: project.created_by });

    // Check permissions to add members
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'team_lead' &&
      project.created_by !== req.user.id
    ) {
      console.log('❌ Access denied:', { userRole: req.user.role, projectCreatedBy: project.created_by, userId: req.user.id });
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
    }

    // Check if user exists
    console.log('🔍 Checking if user exists:', userId);
    const { data: userExists } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!userExists) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    console.log('✅ User found:', userExists.id);

    // Add member
    console.log('💾 Inserting member record...');
    const memberData = {
      project_id: parseInt(projectId),
      user_id: userId,
      role: role,
      added_by: req.user.id,
    };
    console.log('📝 Member data:', memberData);

    const { data: member, error } = await supabase
      .from('project_members')
      .insert(memberData)
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email,
          role
        )
      `)
      .single();

    if (error) {
      console.error('❌ Database error inserting member:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_MEMBER', message: 'User is already a member of this project' }
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message }
      });
    }

    console.log('✅ Member added successfully:', member);
    
    res.status(201).json({
      success: true,
      data: member,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('❌ Server error in add member:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

// Remove project member
router.delete('/:projectId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    // Get member details
    const { data: member, error: fetchError } = await supabase
      .from('project_members')
      .select('*, projects(*)')
      .eq('id', memberId)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !member) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' }
      });
    }

    // Check remove permissions
    if (
      req.user.role !== 'admin' && 
      member.projects.created_by !== req.user.id &&
      member.user_id !== req.user.id && // Users can remove themselves
      req.user.role !== 'team_lead'
    ) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      return res.status(400).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: deleteError.message }
      });
    }

    res.json({
      success: true,
      data: null,
      message: 'Member removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

module.exports = router;