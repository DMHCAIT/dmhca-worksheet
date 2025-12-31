# Work Projections Update - Deployment Checklist

## ✅ Completed
1. ✅ Frontend code updated and deployed to Vercel
2. ✅ Backend routes created (projection-subtasks.js)
3. ✅ Backend server.js updated to include new routes
4. ✅ Code pushed to GitHub (commit 7bacfe8)

## ⚠️ REQUIRED: Database Setup

**CRITICAL**: You must run the SQL migration in Supabase before the feature will work!

### Steps to Complete:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `dmhca-worksheet`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the entire contents of: `database/add-projection-subtasks.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see: "Success. No rows returned"
   - Or check Tables > projection_subtasks exists

### What This Migration Does:
- ✅ Adds `projection_type` column to `work_projections` table
- ✅ Creates `projection_subtasks` table with all fields
- ✅ Sets up proper indexes for performance
- ✅ Configures Row Level Security (RLS) policies
- ✅ Adds triggers for auto-updating timestamps

## 🔄 Backend Deployment

Render auto-deploys from GitHub, but you can force a redeploy:

1. Go to: https://dashboard.render.com
2. Select your backend service: `dmhca-worksheet`
3. Click "Manual Deploy" > "Deploy latest commit"
4. Wait ~2-3 minutes for deployment to complete

## 🧪 Testing After Setup

Once you've run the SQL migration:

1. Go to: https://dmhca-worksheet.vercel.app/projections
2. Click "Add Projection"
3. Select "Weekly" or "Monthly" type
4. Create a projection
5. Click "Work Breakdown & Team Assignment" to expand
6. Click "Add Subtask & Assign Team Member"
7. Fill in the form and add a subtask
8. Verify the subtask appears in the list

## ❌ Current Error Explanation

**404 Error**: `/api/projections/8/subtasks`

This error occurs because:
- The `projection_subtasks` table doesn't exist yet in Supabase
- Backend routes are deployed but have no table to query
- SQL migration hasn't been run

**Fix**: Run the SQL migration in Supabase (see steps above)

## 📞 If You Still See Errors

1. Check Render backend logs for errors
2. Verify the SQL ran successfully in Supabase
3. Check browser console for any other errors
4. Ensure you're logged in with admin role

---

**File Location**: database/add-projection-subtasks.sql
**Created**: 2025-12-31
