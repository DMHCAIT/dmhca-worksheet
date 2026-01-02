# DMHCA Work Tracker - AI Agent Instructions

## Architecture Overview

**Next.js 14 + Express.js + Supabase** hybrid application with frontend deployed on Vercel and backend on Render.

- **Frontend**: Next.js 14 App Router (`app/`) with TypeScript, Tailwind CSS
- **Backend**: Express.js API (`backend/`) providing REST endpoints
- **Database**: Supabase PostgreSQL with RLS policies (`database/schema.sql`)
- **Auth**: Dual system - JWT tokens + Supabase Auth for storage
- **State**: React Query + Zustand for client state, Context API for auth

## Critical Patterns

### Dual API Architecture
```typescript
// Primary: Express backend (tasks, users, projects)
apiClient.get('/api/tasks') // -> backend/routes/

// Secondary: Direct Supabase (file uploads, real-time)
supabase.storage.from('content').upload() // -> lib/supabase/client.ts
```

### Authentication Flow
- Login via Express API sets `authToken` in localStorage + cookies
- Middleware intercepts all API requests to inject Bearer token
- 401 responses trigger automatic redirect to `/login`
- AuthProvider manages user state globally

### File Structure Conventions
- **Pages**: `app/[feature]/page.tsx` (Next.js App Router)
- **Components**: Feature-specific under `components/[feature]/`
- **API Logic**: `lib/api/[entity].ts` with React Query hooks in `lib/hooks/`
- **Types**: Split between `types/entities.ts` (domain) and `types/api.ts` (API responses)

## Development Workflow

### Local Development Setup
```bash
# Backend first (port 5000)
cd backend && npm install && npm run dev

# Frontend (port 3000)  
npm install && npm run dev
```

### Environment Variables Required
- `NEXT_PUBLIC_API_URL` - Backend URL (dev: localhost:5000, prod: render.com)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase connection
- Backend needs Supabase service key for admin operations

### Database Management
- Schema changes: Update `database/schema.sql` then run in Supabase SQL Editor
- Sample data: Use `database/sample-data.sql` for development
- Migration scripts in `database/` for specific features (chat, attendance, etc.)

## Component Patterns

### Page Structure
```tsx
// Standard page layout
export default function TasksPage() {
  return (
    <DashboardLayout>
      <PageHeader title="Tasks" />
      <TaskList />
    </DashboardLayout>
  )
}
```

### API Integration
```typescript
// Use React Query hooks from lib/hooks/
const { data: tasks, isLoading } = useTasks()
const updateTaskMutation = useUpdateTask()

// For new entities, follow pattern in useProjectionsQueries.ts
```

### Error Handling
- API client automatically shows toast notifications for common errors (401, 500, etc.)
- Use `ErrorBoundary.tsx` component for React error boundaries
- Implement loading states with `LoadingSkeleton.tsx`

## Deployment & Production

### Build Process
```bash
# Frontend: Vercel auto-deploys from main branch
# Backend: Render auto-deploys from main branch
./deploy-production.sh # Full deployment script available
```

### Security Headers
- Next.js config includes CSP with specific domains for API and Supabase
- Backend enforces HTTPS, rate limiting, and security headers via Helmet
- Authentication requires both localStorage token and cookie

### Key Files for Debugging
- **API Errors**: Check `lib/api/client.ts` interceptors
- **Auth Issues**: `lib/auth/AuthProvider.tsx` and `middleware.ts`
- **Database**: Review `database/schema.sql` for table structure
- **Deployment**: `PRODUCTION-DEPLOYMENT.md` has production checklist

## Domain-Specific Context

**DMHCA** (Dhanekula Institute of Medical Sciences) work management for:
- Task assignment and tracking with priorities/deadlines
- Project management with team-based organization
- "Projections" = weekly work planning with hour tracking
- Team management with role-based access (admin/team_lead/employee)
- File attachments via Supabase storage integration

When modifying features, maintain the medical institution context and team-based workflows.