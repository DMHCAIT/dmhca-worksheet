# Build Instructions

This Work Tracker application consists of three main components:

## Prerequisites

1. **Node.js 18+** installed
2. **Supabase account** ([supabase.com](https://supabase.com))
3. **Vercel account** ([vercel.com](https://vercel.com)) for frontend
4. **Render account** ([render.com](https://render.com)) for backend

## Quick Start

### 1. Database Setup (Supabase)

1. Create a new project on [Supabase](https://supabase.com)
2. Go to **SQL Editor** in your dashboard
3. Copy and paste the entire content of `database/schema.sql`
4. Click **Run** to create all tables and policies
5. Get your credentials from **Settings** → **API**:
   - Project URL (SUPABASE_URL)
   - anon/public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_KEY)

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Server runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your API URL and Supabase credentials
npm run dev
```

App runs on `http://localhost:3000`

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here
JWT_SECRET=your_very_secure_jwt_secret_min_32_characters
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Production Deployment

### Backend (Render)
1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **New** → **Web Service**
4. Connect your GitHub repository
5. Set **Root Directory** to `backend`
6. Add all environment variables
7. Deploy

### Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variables
5. Deploy

## Creating First Admin User

After deployment, create an admin user:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** with email and password
3. Go to **SQL Editor** and run:

```sql
UPDATE public.profiles 
SET role = 'admin', team = 'admin' 
WHERE email = 'admin@company.com';
```

## Default Teams

- **Admin Team** - Overall management
- **Digital Marketing** - Content creation and design
- **Sales Team** - Sales operations  
- **IT Team** - Technical support