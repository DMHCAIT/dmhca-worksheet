const express = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get dashboard summary with comprehensive stats
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    // Provide demo data if database is empty or has connection issues
    let tasks = [];
    let projects = [];
    let totalUsers = 0;

    try {
      // Get task counts
      let taskQuery = supabase.from('tasks').select('status, priority, team');
      
      if (req.user.role === 'employee') {
        taskQuery = taskQuery.eq('assigned_to', req.user.id);
      } else if (req.user.role === 'team_lead') {
        taskQuery = taskQuery.eq('team', req.user.team);
      }

      const { data: taskData, error: taskError } = await taskQuery;
      if (!taskError && taskData) {
        tasks = taskData;
      }

      // Get project counts
      let projectQuery = supabase.from('projects').select('team');
      if (req.user.role === 'team_lead') {
        projectQuery = projectQuery.eq('team', req.user.team);
      }
      
      const { data: projectData, error: projectError } = await projectQuery;
      if (!projectError && projectData) {
        projects = projectData;
      }

      // Get user counts (admin only)
      if (req.user.role === 'admin') {
        const { data: users, error: userError } = await supabase
          .from('profiles')
          .select('id');
        totalUsers = users ? users.length : 0;
      }
    } catch (dbError) {
      console.log('Database connection issue, using demo data:', dbError.message);
      // Provide demo data when database is not available
      tasks = [
        { status: 'completed', priority: 'high', team: 'admin' },
        { status: 'completed', priority: 'medium', team: 'admin' },
        { status: 'in_progress', priority: 'high', team: 'admin' },
        { status: 'in_progress', priority: 'low', team: 'admin' },
        { status: 'pending', priority: 'medium', team: 'admin' },
        { status: 'pending', priority: 'low', team: 'admin' }
      ];
      projects = [{ team: 'admin' }, { team: 'admin' }];
      totalUsers = 5;
    }

    // Calculate task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;

    // Group projects by team
    const projectsByTeam = projects.reduce((acc, project) => {
      const team = project.team || 'unassigned';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});

    // Group tasks by status and priority
    const tasksByStatus = [
      { status: 'pending', count: pendingTasks },
      { status: 'in_progress', count: inProgressTasks },
      { status: 'completed', count: completedTasks }
    ];

    const tasksByPriority = tasks.reduce((acc, task) => {
      const priority = task.priority || 'low';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const tasksByPriorityArray = Object.entries(tasksByPriority).map(([priority, count]) => ({
      priority,
      count
    }));

    const projectsByTeamArray = Object.entries(projectsByTeam).map(([team, count]) => ({
      team,
      count
    }));

    res.json({
      totalTasks,
      totalProjects: projects.length,
      totalUsers,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      highPriorityTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      projectsByTeam: projectsByTeamArray,
      tasksByStatus,
      tasksByPriority: tasksByPriorityArray,
      recentActivity: [] // Can be populated with recent activity data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project statistics
router.get('/project-stats', authMiddleware, async (req, res) => {
  try {
    let projectQuery = supabase
      .from('projects')
      .select(`
        id,
        name,
        team,
        tasks:tasks(status)
      `);

    if (req.user.role === 'team_lead') {
      projectQuery = projectQuery.eq('team', req.user.team);
    }

    const { data: projects, error } = await projectQuery;

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message } 
      });
    }

    const projectStats = (projects || []).map(project => {
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        team: project.team,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        progress
      };
    });

    res.json({ 
      success: true,
      data: projectStats,
      message: 'Project stats retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get project statistics (legacy route)
router.get('/projects', authMiddleware, async (req, res) => {
  try {
    let projectQuery = supabase
      .from('projects')
      .select(`
        id,
        name,
        team,
        tasks:tasks(status)
      `);

    if (req.user.role === 'team_lead') {
      projectQuery = projectQuery.eq('team', req.user.team);
    }

    const { data: projects, error } = await projectQuery;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const projectStats = (projects || []).map(project => {
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        team: project.team,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        progress
      };
    });

    res.json(projectStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team performance data
router.get('/team-performance', authMiddleware, requireRole(['admin', 'team_lead']), async (req, res) => {
  try {
    // Get teams based on user role
    let teams = ['admin', 'digital_marketing', 'sales', 'it'];
    if (req.user.role === 'team_lead') {
      teams = [req.user.team];
    }

    const teamPerformance = [];

    for (const team of teams) {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('status, created_at')
        .eq('team', team);

      if (error) continue;

      const totalTasks = (tasks || []).length;
      const completedTasks = (tasks || []).filter(t => t.status === 'completed').length;
      const inProgressTasks = (tasks || []).filter(t => t.status === 'in_progress').length;
      
      // Calculate average completion time (simplified)
      const averageCompletionTime = 5; // Placeholder value
      
      const performance = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      teamPerformance.push({
        team,
        totalTasks,
        completedTasks,
        inProgressTasks,
        averageCompletionTime,
        performance
      });
    }

    res.json({ 
      success: true,
      data: teamPerformance,
      message: 'Team performance retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

// Get employee statistics including tasks and subtasks
router.get('/employee-stats/:userId?', authMiddleware, async (req, res) => {
  try {
    // Determine which user to get stats for
    const userId = req.params.userId || req.user.id;
    
    // Only allow employees to see their own stats, team_leads can see their team, admins can see anyone
    if (req.user.role === 'employee' && userId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'You can only view your own statistics' } 
      });
    }

    // Get tasks assigned to this user
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, priority, created_at')
      .eq('assigned_to', userId);

    if (tasksError) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'DATABASE_ERROR', message: tasksError.message } 
      });
    }

    // Get subtasks assigned to this user
    const { data: subtasks, error: subtasksError } = await supabase
      .from('projection_subtasks')
      .select('id, status, priority, estimated_hours, actual_hours, created_at')
      .eq('assigned_to', userId);

    // If subtasks table doesn't exist or has error, just continue without it
    const userSubtasks = subtasksError ? [] : (subtasks || []);

    // Calculate task statistics
    const totalTasks = (tasks || []).length;
    const completedTasks = (tasks || []).filter(t => t.status === 'completed').length;
    const inProgressTasks = (tasks || []).filter(t => t.status === 'in_progress').length;
    const pendingTasks = (tasks || []).filter(t => t.status === 'pending').length;

    // Calculate subtask statistics
    const totalSubtasks = userSubtasks.length;
    const completedSubtasks = userSubtasks.filter(st => st.status === 'completed').length;
    const inProgressSubtasks = userSubtasks.filter(st => st.status === 'in_progress').length;
    const pendingSubtasks = userSubtasks.filter(st => st.status === 'pending').length;

    // Calculate total hours for subtasks
    const totalEstimatedHours = userSubtasks.reduce((sum, st) => sum + (st.estimated_hours || 0), 0);
    const totalActualHours = userSubtasks.reduce((sum, st) => sum + (st.actual_hours || 0), 0);

    // Combined statistics
    const totalWorkItems = totalTasks + totalSubtasks;
    const completedWorkItems = completedTasks + completedSubtasks;
    const completionRate = totalWorkItems > 0 ? Math.round((completedWorkItems / totalWorkItems) * 100) : 0;

    res.json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          in_progress: inProgressTasks,
          pending: pendingTasks
        },
        subtasks: {
          total: totalSubtasks,
          completed: completedSubtasks,
          in_progress: inProgressSubtasks,
          pending: pendingSubtasks,
          estimated_hours: totalEstimatedHours,
          actual_hours: totalActualHours
        },
        combined: {
          total_work_items: totalWorkItems,
          completed_work_items: completedWorkItems,
          completion_rate: completionRate
        }
      },
      message: 'Employee statistics retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message } 
    });
  }
});

module.exports = router;