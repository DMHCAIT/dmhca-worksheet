require('dotenv').config();
const supabase = require('./config/supabase');

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');

    // Create admin user profile
    const adminUser = {
      id: '3cec16bd-bba2-4952-8007-c3926ec43a66',
      email: 'admin@dmhca.com',
      full_name: 'DMHCA Admin',
      role: 'admin',
      team: 'admin',
      phone: '+1-555-0100'
    };

    console.log('👤 Creating admin user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(adminUser)
      .select()
      .single();

    if (profileError) {
      console.log('ℹ️ Admin user might already exist:', profileError.message);
    } else {
      console.log('✅ Admin user created successfully');
    }

    // Create projects
    console.log('📁 Creating projects...');
    const projects = [
      {
        name: 'DMHCA Website Redesign',
        description: 'Complete overhaul of the college website with modern design and responsive layout',
        team: 'admin',
        status: 'active',
        deadline: '2025-03-15',
        created_by: adminUser.id
      },
      {
        name: 'Student Portal Enhancement',
        description: 'Upgrade student portal with new features including online registration and grade tracking',
        team: 'admin',
        status: 'active',
        deadline: '2025-02-28',
        created_by: adminUser.id
      },
      {
        name: 'Digital Library System',
        description: 'Implementation of comprehensive digital library management system',
        team: 'admin',
        status: 'planning',
        deadline: '2025-04-30',
        created_by: adminUser.id
      }
    ];

    const { data: createdProjects, error: projectsError } = await supabase
      .from('projects')
      .upsert(projects)
      .select();

    if (projectsError) {
      console.error('❌ Error creating projects:', projectsError.message);
    } else {
      console.log(`✅ Created ${createdProjects.length} projects`);

      // Create tasks for the projects
      console.log('📋 Creating tasks...');
      const tasks = [
        // Website Redesign Tasks
        {
          title: 'Design Homepage Layout',
          description: 'Create wireframes and mockups for new homepage design',
          status: 'completed',
          priority: 'high',
          project_id: createdProjects[0].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-01-30',
          completed_at: new Date().toISOString(),
          created_by: adminUser.id
        },
        {
          title: 'Develop Responsive CSS',
          description: 'Implement responsive CSS framework for all devices',
          status: 'in_progress',
          priority: 'high',
          project_id: createdProjects[0].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-02-15',
          created_by: adminUser.id
        },
        {
          title: 'Content Migration',
          description: 'Migrate existing content to new website structure',
          status: 'pending',
          priority: 'medium',
          project_id: createdProjects[0].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-02-28',
          created_by: adminUser.id
        },
        // Student Portal Tasks  
        {
          title: 'User Authentication System',
          description: 'Implement secure login system for students and faculty',
          status: 'completed',
          priority: 'high',
          project_id: createdProjects[1].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-01-25',
          completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: adminUser.id
        },
        {
          title: 'Grade Tracking Module',
          description: 'Develop module for students to view their grades online',
          status: 'in_progress',
          priority: 'high',
          project_id: createdProjects[1].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-02-10',
          created_by: adminUser.id
        },
        {
          title: 'Course Registration System',
          description: 'Online course registration and scheduling system',
          status: 'pending',
          priority: 'medium',
          project_id: createdProjects[1].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-02-25',
          created_by: adminUser.id
        },
        // Digital Library Tasks
        {
          title: 'Database Schema Design',
          description: 'Design comprehensive database schema for library resources',
          status: 'pending',
          priority: 'high',
          project_id: createdProjects[2].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-02-05',
          created_by: adminUser.id
        },
        {
          title: 'Search Engine Implementation',
          description: 'Implement advanced search functionality for digital resources',
          status: 'pending',
          priority: 'medium',
          project_id: createdProjects[2].id,
          assigned_to: adminUser.id,
          team: 'admin',
          deadline: '2025-03-15',
          created_by: adminUser.id
        }
      ];

      const { data: createdTasks, error: tasksError } = await supabase
        .from('tasks')
        .upsert(tasks)
        .select();

      if (tasksError) {
        console.error('❌ Error creating tasks:', tasksError.message);
      } else {
        console.log(`✅ Created ${createdTasks.length} tasks`);
      }
    }

    // Create work projections
    console.log('📊 Creating work projections...');
    const projections = [
      {
        title: 'Q1 2025 Website Development',
        description: 'Complete website redesign and launch new portal features',
        team: 'admin',
        target_completion_date: '2025-03-31',
        estimated_hours: 480,
        priority: 'high',
        status: 'active',
        user_id: adminUser.id
      },
      {
        title: 'Q2 2025 Digital Infrastructure',
        description: 'Implement digital library and enhance IT infrastructure',
        team: 'admin',
        target_completion_date: '2025-06-30',
        estimated_hours: 720,
        priority: 'medium',
        status: 'planning',
        user_id: adminUser.id
      }
    ];

    const { data: createdProjections, error: projectionsError } = await supabase
      .from('work_projections')
      .upsert(projections)
      .select();

    if (projectionsError) {
      console.error('❌ Error creating projections:', projectionsError.message);
    } else {
      console.log(`✅ Created ${createdProjections.length} work projections`);
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('📊 Summary:');
    console.log('- 1 Admin user profile');
    console.log(`- ${createdProjects ? createdProjects.length : 0} Projects`);
    console.log(`- ${createdTasks ? createdTasks.length : 0} Tasks`);
    console.log(`- ${createdProjections ? createdProjections.length : 0} Work projections`);

  } catch (error) {
    console.error('💥 Database initialization failed:', error.message);
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;