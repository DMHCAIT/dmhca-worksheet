# Database Migration Steps - Run These in Order

## 🔧 Required Migrations for Full Functionality

Run these SQL scripts in your **Supabase SQL Editor** to enable all features:

---

## 1️⃣ Add Department & Phone Columns (URGENT - Required for Chat & Team Page)

**File:** `database/add-department-phone.sql`

**What it does:**
- Adds `department` and `phone` columns to profiles table
- Migrates existing team data to department field
- Creates indexes for better performance

**Instructions:**
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `database/add-department-phone.sql`
3. Click "Run"
4. Verify: `SELECT id, email, department, phone FROM profiles LIMIT 5;`

---

## 2️⃣ Enable Chat System (Required for Chat Page)

**File:** `database/add-chat-system.sql`

**What it does:**
- Creates `chat_messages` table for 1-on-1 messaging
- Creates `user_online_status` table for online/offline tracking
- Adds RLS policies for secure chat access
- Creates indexes for fast message retrieval

**Instructions:**
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `database/add-chat-system.sql`
3. Click "Run"
4. Verify: `SELECT * FROM chat_messages LIMIT 1;`

---

## 3️⃣ Projection Subtasks (Already Done ✅)

This should already be completed, but verify:

```sql
SELECT COUNT(*) FROM projection_subtasks;
```

If this returns an error, run `database/add-projection-subtasks.sql`

---

## After Running Migrations

### Update Backend to Use New Fields

Once migrations are complete, update the backend:

1. Open `backend/routes/users.js`
2. Find line ~13 (in GET / route)
3. Change:
   ```javascript
   .select('id, email, full_name, role, team, avatar_url, created_at, updated_at');
   ```
   To:
   ```javascript
   .select('id, email, full_name, role, team, department, phone, avatar_url, created_at, updated_at');
   ```

4. Commit and push:
   ```bash
   git add backend/routes/users.js
   git commit -m "Enable department and phone fields in users API"
   git push origin main
   ```

---

## Verification Checklist

After all migrations and backend update:

- [ ] Chat page shows user list
- [ ] Team page shows departments in table
- [ ] Team page department filter works
- [ ] Team page edit modal can update department/phone
- [ ] Tasks page shows projection subtasks
- [ ] No 400/403 errors in browser console

---

## Current Status

✅ **Completed:**
- Work Projections (weekly/monthly)
- Projection Subtasks
- Tasks page with subtasks
- Reports page with filters
- Team page with edit functionality
- Authorization fixes for all users

⏳ **Pending Migrations:**
- Department & Phone columns → Run `add-department-phone.sql`
- Chat system → Run `add-chat-system.sql`

🔄 **After Migrations:**
- Update users.js to include department and phone fields
- Redeploy backend

---

## Troubleshooting

**"No users found" in Chat:**
- Run `add-department-phone.sql` migration
- Wait 2-3 minutes for Render backend deployment
- Hard refresh browser (Cmd+Shift+R)

**400 errors on /api/users:**
- Migration not run yet OR
- Backend still deploying on Render
- Check Render dashboard for deployment status

**403 errors:**
- Should be fixed with latest deployment
- Clear browser cache and reload
