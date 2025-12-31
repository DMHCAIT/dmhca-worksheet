# Chat System Deployment Guide

## Overview
Complete real-time chat system with online/offline status tracking for team collaboration.

## Features Implemented
✅ One-on-one direct messaging  
✅ Real-time message updates (2-second polling)  
✅ Online/offline status indicators  
✅ Unread message badges  
✅ Last seen timestamps  
✅ User search functionality  
✅ Message history  
✅ Auto-scroll to latest messages  
✅ Heartbeat to maintain online status  

## Deployment Steps

### 1. Database Setup (Supabase)

**Run SQL Migration:**
1. Go to Supabase Dashboard → SQL Editor
2. Open `database/add-chat-system.sql`
3. Copy all contents
4. Click "Run" in SQL Editor
5. Verify tables created:
   - `chat_messages` (stores all messages)
   - `user_online_status` (tracks who's online)

**Expected Result:**
```
✅ 2 tables created
✅ 8 indexes created
✅ 7 RLS policies created
✅ 2 triggers created
```

### 2. Backend Deployment (Render)

**The backend is already updated with:**
- New route: `/api/chat` (6 endpoints)
- Chat routes registered in `server.js`

**Manual Deploy:**
1. Go to dashboard.render.com
2. Select your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 2-3 minutes for deployment
5. Check logs for: `🚀 Server running on port 5000`

**Verify Endpoints:**
- GET `/api/chat/conversations` - List of users with chat history
- GET `/api/chat/messages/:userId` - Messages with specific user
- POST `/api/chat/messages` - Send new message
- POST `/api/chat/status/online` - Set user online
- POST `/api/chat/status/offline` - Set user offline
- GET `/api/chat/unread-count` - Total unread messages

### 3. Frontend Deployment (Vercel)

**Auto-deploys from GitHub in 1-2 minutes**

**New Features:**
- `/chat` page - Full chat interface
- Chat link in sidebar (💬 icon)
- Real-time message polling
- Online status tracking
- Unread message counts

## Testing the Chat System

### Test 1: Send a Message
1. Login as Admin (Santhosh)
2. Click "Chat" in sidebar
3. Select a user (e.g., lahareesh)
4. Type a message and click Send
5. ✅ Message appears on right (blue bubble)

### Test 2: Online Status
1. Open chat page (stays online)
2. Check user list - should see green dot for online users
3. Close tab - status becomes offline after 30 seconds
4. ✅ Offline users show "Last seen" timestamp

### Test 3: Receive Messages
1. Login as User A
2. Login as User B in different browser/incognito
3. Send message from User B to User A
4. ✅ User A sees message appear within 2 seconds
5. ✅ Unread badge appears on User B in User A's list

### Test 4: Conversation List
1. Send messages to multiple users
2. Check conversation list
3. ✅ Shows all users you've chatted with
4. ✅ Unread counts show as blue badges
5. ✅ Online users have green dot

## How It Works

### Real-Time Updates
- **Message Polling**: Fetches new messages every 2 seconds
- **Conversation Polling**: Updates user list every 5 seconds
- **Online Heartbeat**: Sends "I'm alive" every 30 seconds

### Online Status Tracking
- User opens chat → POST `/api/chat/status/online`
- Every 30 seconds → POST `/api/chat/status/online` (heartbeat)
- User closes tab → POST `/api/chat/status/offline`
- System shows green dot if online, gray if offline

### Message Flow
1. User types message
2. Click Send → POST `/api/chat/messages`
3. Message saved to database
4. Receiver's app polls → GET `/api/chat/messages/:userId`
5. New message appears (auto-scroll to bottom)
6. Message marked as read automatically

## Database Schema

### chat_messages Table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| sender_id | UUID | Who sent it |
| receiver_id | UUID | Who receives it |
| message | TEXT | Message content |
| is_read | BOOLEAN | Read status |
| created_at | TIMESTAMP | When sent |

### user_online_status Table
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key |
| is_online | BOOLEAN | Currently online? |
| last_seen | TIMESTAMP | Last activity time |

## Security (RLS Policies)

**Messages:**
- Users can only view messages they sent or received
- Users can only send messages as themselves
- Users can only mark their own received messages as read

**Online Status:**
- All users can see who's online
- Users can only update their own status

## Timeline

**Total Setup Time: ~5 minutes**
1. SQL Migration: 30 seconds
2. Backend Deploy: 2-3 minutes
3. Frontend Deploy: 1-2 minutes
4. Testing: 1 minute

## Troubleshooting

**Issue: Messages not appearing**
- Check browser console for 401 errors
- Verify authToken exists in localStorage
- Check Render backend logs

**Issue: Online status not updating**
- Make sure chat page is open
- Check Network tab for heartbeat requests
- Verify SQL migration ran successfully

**Issue: Can't see any users**
- Make sure users exist in profiles table
- Check if you're excluding yourself correctly
- Verify API returns user list

## Future Enhancements (Optional)

- ✨ Group chats
- ✨ File attachments
- ✨ Voice messages
- ✨ Read receipts
- ✨ Typing indicators
- ✨ Message search
- ✨ Message deletion
- ✨ Emoji reactions
- ✨ Desktop notifications

## Success Criteria

✅ Users can send and receive messages  
✅ Online status shows correctly  
✅ Unread counts update automatically  
✅ Messages persist after page refresh  
✅ No authentication errors  
✅ Real-time updates work within 2 seconds  

---

**Status:** Ready to deploy! All code committed and pushed to GitHub.
