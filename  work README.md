# Work Tracker - Complete Employee Management System

A comprehensive work tracking and project management application built with **Next.js**, **Node.js/Express**, and **Supabase**. Perfect for managing teams including Admin, Digital Marketing (Editors, Content Writers, Designers), Sales, and IT departments.

## 🚀 Features

### For All Users
- ✅ **Task Management** - Create, assign, and track tasks with priorities and deadlines
- 📊 **Dashboard** - Real-time overview of tasks, projects, and team performance
- 📅 **Work Projections** - Submit weekly/monthly work plans
- ⏱️ **Time Tracking** - Log hours worked on tasks
- 💬 **Comments & Collaboration** - Add comments and attachments to tasks
- 🔔 **Notifications** - Real-time alerts for task assignments and deadlines

### For Admin & Team Leads
- 👥 **Team Management** - Manage users across multiple departments
- 📁 **Project Creation** - Create and organize projects by team
- 📈 **Reports & Analytics** - Team performance, productivity trends, and insights
- ✓ **Review System** - Approve/reject work projections and submissions
- 👁️ **Monitor All Teams** - Admin can see company-wide data

### For Employees
- 📝 **Submit Projections** - Plan and submit weekly work schedules
- 📋 **Task Updates** - Update task status and progress
- 📊 **Personal Stats** - View your productivity metrics

## 🏗️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (React)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **API Client:** Axios
- **Date Handling:** date-fns
- **Charts:** Recharts
- **Notifications:** React Hot Toast
- **Deployment:** Vercel

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + JWT
- **Deployment:** Render

### Database
- **Provider:** Supabase
- **Type:** PostgreSQL with Row Level Security (RLS)
- **Features:** Real-time subscriptions, Storage, Auth

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- Supabase account ([supabase.com](https://supabase.com))
- Vercel account ([vercel.com](https://vercel.com))
- Render account ([render.com](https://render.com))

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd work-tracker
```

### 2. Setup Supabase Database

1. Create a new project on [Supabase](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy and paste the entire content of `database/schema.sql`
4. Click **Run** to create all tables and policies
5. Get your credentials:
   - Go to **Settings** → **API**
   - Copy `Project URL` (SUPABASE_URL)
   - Copy `anon/public` key (SUPABASE_ANON_KEY)
   - Copy `service_role` key (SUPABASE_SERVICE_KEY) - Keep this secret!

### 3. Backend Setup (Deploy to Render)

```bash
cd backend
npm install
```

#### Environment Variables for Render

Create a `.env` file or add these in Render dashboard:

```env
PORT=5000
NODE_ENV=production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# JWT Secret (generate a strong random string)
JWT_SECRET=your_very_secure_jwt_secret_min_32_characters

# Frontend URL
FRONTEND_URL=https://your-frontend.vercel.app
```

#### Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** work-tracker-api
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add all environment variables from above
6. Click **Create Web Service**
7. Copy your backend URL (e.g., `https://work-tracker-api.onrender.com`)

### 4. Frontend Setup (Deploy to Vercel)

```bash
cd frontend
npm install
```

#### Environment Variables for Vercel

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

#### Deploy to Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel login`
3. In the `frontend` directory, run: `vercel`
4. Follow the prompts to deploy
5. Add environment variables in Vercel dashboard:
   - Go to **Settings** → **Environment Variables**
   - Add all variables from `.env.local`
6. Redeploy: `vercel --prod`

Alternatively, connect GitHub repo to Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Import Project**
3. Connect GitHub and select your repository
4. Set **Root Directory** to `frontend`
5. Add environment variables
6. Click **Deploy**

## 🚀 Local Development

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm install
npm run dev
```

App runs on `http://localhost:3000`

## 👥 Default User Roles & Teams

### Teams
- **Admin Team** - Overall management
- **Digital Marketing** - Content creation and design
  - Editors
  - Content Writers
  - Designers
- **Sales Team** - Sales operations
- **IT Team** - Technical support

### Roles
- **Admin** - Full access to all features
- **Team Lead** - Manage team members and tasks
- **Employee** - Submit work, update tasks

## 🔐 Creating First Admin User

After deploying, create an admin user using Supabase Auth:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User**
3. Enter email and password
4. Go to **SQL Editor** and run:

```sql
UPDATE public.profiles 
SET role = 'admin', team = 'admin' 
WHERE email = 'admin@company.com';
```

Or use the backend API:

```bash
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "secure_password",
    "full_name": "Admin User",
    "role": "admin",
    "team": "admin"
  }'
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user (admin only)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users` - Get all users (admin/team_lead)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/stats` - Get user statistics

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project (admin/team_lead)
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (admin)

### Tasks
- `GET /api/tasks` - Get all tasks (filtered by role)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task (admin/team_lead)
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add comment
- `POST /api/tasks/:id/time-logs` - Add time log

### Work Projections
- `GET /api/projections` - Get projections
- `GET /api/projections/:id` - Get projection by ID
- `POST /api/projections` - Create projection
- `PUT /api/projections/:id` - Update projection
- `POST /api/projections/:id/review` - Review projection (admin/team_lead)
- `DELETE /api/projections/:id` - Delete projection

### Reports
- `GET /api/reports/dashboard` - Get dashboard summary
- `GET /api/reports/team-performance` - Get team performance
- `GET /api/reports/productivity-trends` - Get productivity trends
- `GET /api/reports/upcoming-deadlines` - Get upcoming deadlines

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/unread-count` - Get unread count

## 📊 Database Schema

### Main Tables
- **profiles** - User information and roles
- **projects** - Project management
- **tasks** - Task tracking
- **work_projections** - Employee work planning
- **time_logs** - Time tracking
- **task_comments** - Task discussions
- **task_attachments** - File uploads
- **notifications** - User notifications

## 🔒 Security Features

- Row Level Security (RLS) policies
- JWT-based authentication
- Role-based access control (RBAC)
- Secure password hashing
- API rate limiting
- CORS protection

## 🎨 UI Features

- Responsive design for all devices
- Real-time notifications
- Interactive dashboards
- Data visualization with charts
- Intuitive task management
- Dark mode support (can be added)

## 📱 Features Roadmap

- [ ] Mobile app (React Native)
- [ ] Email notifications
- [ ] Calendar integration
- [ ] File upload to Supabase Storage
- [ ] Advanced analytics
- [ ] Export reports (PDF/Excel)
- [ ] Kanban board view
- [ ] Time tracking timer
- [ ] Task dependencies
- [ ] Recurring tasks

## 🤝 Support & Contributing

For issues or questions:
1. Check existing documentation
2. Review API responses for errors
3. Check browser console for frontend errors
4. Review Render logs for backend errors

## 📝 License

This project is licensed under the MIT License.

## 🎉 Credits

Built with:
- Next.js
- Express.js
- Supabase
- Tailwind CSS
- Vercel
- Render

---

**Happy Tracking! 🚀**

For additional help, contact your system administrator or check the documentation at [your-docs-url].
