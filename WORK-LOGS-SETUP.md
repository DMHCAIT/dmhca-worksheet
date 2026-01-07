# Daily Work Logs & Reports System - Setup Guide

## 🚀 What's New

A complete daily work logging and reporting system has been added to the DMHCA Work Tracker. Employees can now:
- Submit daily work updates
- Generate weekly reports (Monday-Saturday)
- Generate monthly reports (1st to last day)
- Download reports as PDF

---

## 📋 Step 1: Database Setup

### Run the SQL Migration in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of: `database/add-daily-work-logs.sql`
5. Click **Run** to execute the migration

This will create:
- `daily_work_logs` table
- Proper indexes for performance
- Row Level Security policies
- Required permissions

---

## 📦 Step 2: Install Frontend Dependencies

Run this command in your project root:

```bash
npm install jspdf jspdf-autotable
```

This installs the PDF generation libraries needed for downloadable reports.

---

## 🔄 Step 3: Deployment

### Backend Deployment (Automatic)
- Backend changes are already pushed to GitHub
- Render will auto-deploy in ~3-5 minutes
- New API endpoints available at `/api/work-logs/*`

### Frontend Deployment (Automatic)
- Frontend changes are already pushed to GitHub
- Vercel will auto-deploy in ~2 minutes
- New "Work Logs" menu item will appear in sidebar

---

## 📱 How to Use

### For Employees

#### Daily Work Log
1. Click **"Work Logs"** in the sidebar (📝 icon)
2. Fill in today's work log:
   - **Work Description** (required) - What you worked on
   - **Hours Worked** - Total hours for the day
   - **Achievements** - Key accomplishments
   - **Challenges** - Any blockers or issues
3. Click **"Submit Log"**
4. You can update the log multiple times during the day

#### View Reports
1. Click **"Work Logs"** → **"Weekly & Monthly Reports"** tab
2. Select report type:
   - **Weekly**: Monday-Saturday
   - **Monthly**: Full month (1st to last day)
3. Pick the date/month
4. Click **"Download PDF"** to get a formatted report

### For Admins & Team Leads

You can view reports for any team member by:
1. Going to Work Logs → Reports tab
2. The API accepts `?user_id=<uuid>` parameter
3. Team leads see their team's reports
4. Admins see all reports

---

## 🔗 API Endpoints

### For Employees

**Get Today's Log**
```
GET /api/work-logs/today
Authorization: Bearer {token}
```

**Submit/Update Today's Log**
```
POST /api/work-logs/today
Authorization: Bearer {token}
Body: {
  work_description: "...",
  tasks_completed: [],
  hours_worked: 8.0,
  challenges: "...",
  achievements: "..."
}
```

**Weekly Report (Monday-Saturday)**
```
GET /api/work-logs/weekly-report?week_start=2026-01-06
Authorization: Bearer {token}
```

**Monthly Report (1st to end of month)**
```
GET /api/work-logs/monthly-report?year=2026&month=1
Authorization: Bearer {token}
```

### For Admins/Team Leads

Add `&user_id={uuid}` to any report endpoint to view specific employee's data.

---

## 📊 Report Contents

### Weekly Report Includes:
- Tasks received during the week
- Tasks completed during the week
- Subtasks completed
- Total hours worked (from daily logs + subtask tracking)
- Completion rate percentage
- Daily work log entries
- All tasks and subtasks for that week

### Monthly Report Includes:
- All weekly report data for entire month
- Weekly breakdown showing hours per week
- Total days logged vs total days in month
- Complete task and subtask list
- Month-over-month statistics

---

## 🎨 PDF Report Format

Downloaded reports include:
- **Header**: Employee name, department, period
- **Summary Statistics**: Visual table with key metrics
- **Daily Work Logs**: Table showing all logged days
- **Tasks & Subtasks**: Complete list with status
- **Footer**: Generation timestamp and page numbers

---

## ✅ Features

### Daily Work Logs
✅ One log per day per employee
✅ Can update multiple times
✅ Tracks hours, achievements, challenges
✅ Automatically links to tasks/subtasks

### Reports
✅ Weekly (Mon-Sat) and Monthly views
✅ Counts both tasks AND subtasks
✅ Shows completion rates
✅ Tracks total hours worked
✅ Downloadable as professional PDF

### Security
✅ Employees can only see their own logs
✅ Team leads see their team's logs
✅ Admins see all logs
✅ Row Level Security enforced in database

---

## 🧪 Testing

### Test Daily Log Submission
1. Navigate to `/work-logs`
2. Fill in the form and submit
3. Check for success toast notification
4. Refresh - data should persist

### Test Weekly Report
1. Go to Reports tab
2. Select "Weekly Report"
3. Pick current week
4. Verify data shows correctly
5. Click Download PDF
6. Check PDF contains all data

### Test Monthly Report
1. Select "Monthly Report"
2. Pick current month
3. Verify weekly breakdown
4. Download and review PDF

---

## 🐛 Troubleshooting

### "Failed to save work log"
- Check if `daily_work_logs` table exists in Supabase
- Verify RLS policies are created
- Check browser console for errors

### "Failed to load report"
- Ensure backend is deployed (check Render dashboard)
- Verify API endpoint is accessible
- Check if `projection_subtasks` table exists (for subtask counting)

### PDF Download Not Working
- Clear browser cache
- Check browser console for jsPDF errors
- Verify jspdf and jspdf-autotable are installed

### No Data in Reports
- Ensure work logs have been submitted
- Check date range is correct
- Verify tasks/subtasks exist for the period

---

## 📅 Workflow Recommendation

### Daily Routine (For Employees)
1. **Morning**: Clock in via Attendance
2. **Throughout Day**: Work on tasks/subtasks
3. **End of Day**: 
   - Clock out via Attendance
   - Submit Work Log for the day
4. **Weekly**: Review your weekly report

### Weekly Routine (For Team Leads)
1. Review team's weekly reports
2. Check completion rates
3. Identify blockers from daily logs
4. Follow up with team members

### Monthly Routine (For Admins)
1. Generate monthly reports for all employees
2. Analyze trends and performance
3. Plan for next month
4. Archive reports for records

---

## 🎯 Next Steps

After deployment is complete:
1. Test daily work log submission
2. Submit a few logs for testing
3. Generate a weekly report
4. Download and review the PDF
5. Train employees on the new system

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Check Render logs for backend errors
3. Check Vercel logs for frontend errors
4. Review browser console for client-side errors

---

**System Status**: ✅ Deployed
**Database**: ✅ Migration ready
**Frontend**: ✅ Auto-deploying to Vercel
**Backend**: ✅ Auto-deploying to Render
