# DMHCA Work Tracker

A comprehensive work management system built for DMHCA (Dhanekula Institute of Medical Sciences) to track tasks, manage projects, monitor team performance, and generate detailed reports.

## 🚀 Features

### 📊 Dashboard
- Real-time statistics and metrics
- Interactive charts (Pie charts, Bar charts, Line charts)
- Recent tasks and project progress
- Activity feed and quick actions
- Completion rate tracking

### ✅ Task Management
- Create, edit, and delete tasks
- Priority levels (High, Medium, Low)
- Status tracking (Pending, In Progress, Completed)
- Assignment to team members
- Due date management
- Advanced filtering and sorting

### 📁 Project Management
- Project creation and tracking
- Progress visualization
- Task association with projects
- Project status monitoring
- Team collaboration tools

### 👥 Team Management
- Team member profiles
- Role-based access
- Performance tracking
- User management
- Activity monitoring

### 📈 Reports & Analytics
- Dashboard statistics
- Project performance reports
- Team performance analytics
- Completion rate analysis
- Interactive charts and graphs

### 🔮 Projections
- Future planning tools
- Resource allocation
- Timeline projections
- Capacity planning

### ⚙️ Settings
- User profile management
- System configuration
- Notification preferences
- Account settings

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **UI Components**: Custom React components
- **State Management**: React Context API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT-based (Demo mode available)
- **API**: RESTful API architecture

### Development Tools
- **Package Manager**: npm
- **Version Control**: Git
- **Code Quality**: ESLint, Prettier
- **Build Tool**: Next.js built-in

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/DMHCAIT/dmhca-worksheet.git
   cd dmhca-worksheet
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   
   **Backend (.env file in /backend directory):**
   ```env
   PORT=5001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```
   
   **Frontend (.env.local file in /frontend directory):**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5001
   NEXT_PUBLIC_ENVIRONMENT=development
   ```

5. **Database Setup**
   - Create a Supabase project
   - Run the SQL schema from `/database/schema.sql`
   - Update environment variables with your Supabase credentials

6. **Start the Application**
   
   **Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend Server:**
   ```bash
   cd frontend
   npm run dev
   ```

7. **Access the Application**
   - Frontend: http://localhost:3000 (or 3001 if 3000 is in use)
   - Backend API: http://localhost:5001

## 🎯 Usage

### Demo Mode
The application includes a demo mode that allows you to explore all features without authentication. Simply access the application URL and start using all functionalities immediately.

### Authentication
When not in demo mode, the system supports:
- User registration and login
- Role-based access control
- JWT token management
- Session handling

### Navigation
- **Dashboard**: Overview of all activities and statistics
- **Tasks**: Manage individual tasks and assignments
- **Projects**: Organize work into projects
- **Team**: View and manage team members
- **Reports**: Generate and view analytical reports
- **Projections**: Plan future work and resources
- **Settings**: Configure user and system settings

## 🚀 Deployment

### Production Environment Variables

**Backend:**
```env
NODE_ENV=production
PORT=5001
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_key
JWT_SECRET=your_production_jwt_secret
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=your_production_backend_url
NEXT_PUBLIC_ENVIRONMENT=production
```

### Deployment Platforms
- **Frontend**: Vercel, Netlify, or any static hosting service
- **Backend**: Railway, Render, Heroku, or any Node.js hosting service
- **Database**: Supabase (managed PostgreSQL)

## 📋 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Task Endpoints
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Project Endpoints
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### User Endpoints
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Report Endpoints
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/projects` - Project reports
- `GET /api/reports/team-performance` - Team performance

### Projection Endpoints
- `GET /api/projections` - Get projections
- `POST /api/projections` - Create projection
- `PUT /api/projections/:id` - Update projection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for DMHCA (Dhanekula Institute of Medical Sciences).

## 📞 Support

For support, please contact the DMHCA IT Team:
- Email: it@dmhca.edu
- Phone: [Contact Number]

## 🏥 About DMHCA

Dhanekula Institute of Medical Sciences (DMHCA) is committed to excellence in medical education and healthcare services. This work tracker system is designed to enhance operational efficiency and project management within the institution.

---

**Developed with ❤️ for DMHCA by the IT Team**