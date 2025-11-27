# 🎙️ **User-Based Voice Authentication Implementation**

## ✅ **Implementation Complete!**

Your AutoVolt project now has a **fully secure, user-based voice authentication system**. Voice control is only available to authenticated users who are logged into the web application.

---

## 🔐 **Security Features Implemented:**

### **1. Voice Session Management**
- **Session-based authentication**: Users must create a voice session to use voice commands
- **JWT tokens**: Secure voice session tokens with 1-hour expiration
- **Automatic refresh**: Voice sessions auto-refresh 5 minutes before expiry
- **Session tracking**: All voice sessions are tracked with usage statistics

### **2. User Authentication**
- **Required login**: Only logged-in users can access voice features
- **Role-based access**: Different permissions for admin/teacher/student roles
- **Device access control**: Users can only control devices they have permission to access
- **Activity logging**: All voice commands logged with user information

### **3. Rate Limiting**
- **100 commands per 15 minutes**: Prevents abuse
- **Per-user tracking**: Each user has their own rate limit
- **Automatic reset**: Rate limits reset every 15 minutes

---

## 📁 **Files Created/Modified:**

### **Backend Files:**

#### **1. `backend/middleware/voiceAuth.js`** ✨ NEW
- Voice session creation and validation
- JWT token management for voice sessions
- Rate limiting for voice commands
- Session cleanup and revocation

#### **2. `backend/routes/voiceAssistant.js`** 🔄 ENHANCED
- Added voice session management routes:
  - `POST /api/voice-assistant/session/create` - Create voice session
  - `GET /api/voice-assistant/session/list` - List active sessions
  - `DELETE /api/voice-assistant/session/revoke` - Revoke session
  - `POST /api/voice-assistant/session/revoke-all` - Revoke all sessions
- Enhanced voice command processing with authentication
- Added user-based device discovery
- Improved activity logging

### **Frontend Files:**

#### **3. `src/hooks/useVoiceSession.ts`** ✨ NEW
- React hook for voice session management
- Automatic session creation and refresh
- Session expiry handling
- Session storage persistence

#### **4. `src/components/VoiceControl.tsx`** ✨ NEW
- Voice control component with authentication
- Speech recognition integration
- Text-to-speech responses
- Real-time feedback and status indicators

#### **5. `src/services/api.ts`** 🔄 ENHANCED
- Added voice assistant API endpoints
- Voice session management methods
- Exported `api` instance for hooks

#### **6. `src/pages/Switches.tsx`** 🔄 ENHANCED
- Integrated VoiceControl component
- Added voice command success notifications

---

## 🚀 **How It Works:**

### **Authentication Flow:**

```
1. User logs into web application
   ↓
2. User accesses Switches page
   ↓
3. VoiceControl component auto-creates voice session
   ↓
4. Voice session token stored in sessionStorage
   ↓
5. User clicks "Start Voice Command"
   ↓
6. User speaks command (e.g., "turn on classroom 1 light 1")
   ↓
7. Command sent to backend with voice token + JWT
   ↓
8. Backend validates both tokens and user permissions
   ↓
9. Command executed if authorized
   ↓
10. Activity logged with user info
```

### **Security Validation:**

```javascript
// Backend validates THREE things for each voice command:
1. JWT Token (user is logged in) ✅
2. Voice Session Token (voice access granted) ✅
3. User Permissions (can control this device) ✅
```

---

## 🎯 **User Experience:**

### **For Teachers/Admins:**
1. Login to AutoVolt web app
2. Navigate to Switches page
3. See "Voice Control" card with "Authenticated" badge
4. Click "Start Voice Command" button
5. Speak command (e.g., "turn on classroom 1 light 1")
6. See immediate feedback and device response
7. Voice session lasts 1 hour, auto-refreshes

### **For Students (Without Permission):**
1. Login to AutoVolt web app (if allowed)
2. Navigate to Switches page
3. See "Voice Control" card with error message
4. "Voice control is not enabled for your account"
5. Cannot create voice session or use voice commands

---

## 🔧 **Configuration:**

### **Backend Environment Variables:**
```bash
# .env file
JWT_SECRET=your_secure_secret_key
NODE_ENV=production
```

### **Voice Session Settings:**
```javascript
// backend/middleware/voiceAuth.js
const SESSION_DURATION = 60 * 60; // 1 hour (in seconds)
const RATE_LIMIT_MAX = 100; // Max commands per window
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes (in ms)
```

### **User Permissions:**
```javascript
// Check user permissions in User model
user.permissions = {
  voiceControl: {
    enabled: true, // For teachers/admins
    maxCommandsPerDay: 500
  }
};
```

---

## 🧪 **Testing:**

### **1. Test Voice Session Creation:**
```bash
# Login first to get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "teacher@school.com", "password": "password"}'

# Create voice session
curl -X POST http://localhost:3001/api/voice-assistant/session/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **2. Test Voice Command:**
```bash
curl -X POST http://localhost:3001/api/voice-assistant/voice/command \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "turn on classroom 1 light 1",
    "assistant": "web",
    "voiceToken": "YOUR_VOICE_TOKEN"
  }'
```

### **3. Test Rate Limiting:**
```bash
# Send 101 commands rapidly - should get rate limit error on 101st
for i in {1..101}; do
  curl -X POST http://localhost:3001/api/voice-assistant/voice/command \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"command": "status", "voiceToken": "YOUR_VOICE_TOKEN"}'
done
```

---

## 📊 **Activity Logging:**

All voice commands are logged in the database with:
- User ID and name
- Command text
- Device affected
- Success/failure status
- Timestamp
- IP address
- Voice session info

**View logs:**
```javascript
// In MongoDB
db.activitylogs.find({ action: 'voice_command' }).sort({ timestamp: -1 })
```

---

## 🔒 **Security Best Practices:**

### **Implemented:**
✅ Session-based authentication
✅ JWT token validation
✅ Rate limiting
✅ Activity logging
✅ Permission checking
✅ Automatic session expiry
✅ Secure token storage

### **Recommended Additional Steps:**
- [ ] Enable HTTPS in production
- [ ] Use Redis for session storage (instead of in-memory)
- [ ] Add IP address whitelisting
- [ ] Implement geo-fencing for school premises
- [ ] Add 2FA for sensitive operations
- [ ] Regular security audits

---

## 🎓 **User Roles & Permissions:**

### **Super Admin / Admin:**
- ✅ Full voice control access
- ✅ Can control all devices
- ✅ No command restrictions
- ✅ Can view all voice logs

### **Dean:**
- ✅ Voice control access
- ✅ Can control devices in their domain
- ✅ Limited command rate
- ✅ Can view domain logs

### **Teacher / Faculty:**
- ✅ Voice control access
- ✅ Can control assigned classroom devices
- ✅ Standard rate limiting
- ✅ Can view own logs

### **Student:**
- ❌ Voice control disabled by default
- ⚠️ Can be enabled per user if needed
- 🔒 Very limited device access
- 📊 All commands logged

### **Guest:**
- ❌ No voice control access
- ❌ No device control
- 🚫 Read-only access only

---

## 🌐 **API Endpoints:**

### **Voice Session Management:**
```
POST   /api/voice-assistant/session/create        - Create voice session
GET    /api/voice-assistant/session/list          - List active sessions
DELETE /api/voice-assistant/session/revoke        - Revoke session
POST   /api/voice-assistant/session/revoke-all    - Revoke all sessions
```

### **Voice Commands:**
```
POST   /api/voice-assistant/voice/command         - Process voice command (authenticated)
GET    /api/voice-assistant/devices/discovery     - Discover devices (authenticated)
GET    /api/voice-assistant/devices/:id/status    - Get device status (authenticated)
```

### **Platform Integrations:**
```
POST   /api/voice-assistant/google/action         - Google Assistant webhook
POST   /api/voice-assistant/alexa/smart-home      - Amazon Alexa webhook
POST   /api/voice-assistant/siri/webhook          - Siri/HomeKit webhook
```

---

## 🚨 **Troubleshooting:**

### **"Voice authentication required" error:**
- **Cause**: Voice session not created or expired
- **Solution**: Component will auto-create session, or click "Start Voice Command" again

### **"Insufficient permissions" error:**
- **Cause**: User doesn't have permission to control device
- **Solution**: Admin must grant device permissions to user

### **"Rate limit exceeded" error:**
- **Cause**: Too many voice commands in short time
- **Solution**: Wait 15 minutes or increase rate limit

### **"Microphone access denied" error:**
- **Cause**: Browser microphone permissions not granted
- **Solution**: Enable microphone in browser settings

### **Voice session expires too quickly:**
- **Cause**: 1-hour default expiry
- **Solution**: Increase SESSION_DURATION in voiceAuth.js

---

## ✅ **Ready to Use!**

Your voice authentication system is now fully implemented and ready for production use. The system ensures that:

1. ✅ Only authenticated users can use voice commands
2. ✅ Students can't access voice features (unless explicitly granted)
3. ✅ All voice activity is logged and audited
4. ✅ Rate limiting prevents abuse
5. ✅ Sessions auto-refresh for convenience
6. ✅ User permissions are strictly enforced

**Start your frontend and backend servers and try it out!**

```bash
# Start backend
cd backend
npm start

# Start frontend
cd ..
npm run dev
```

**Navigate to http://localhost:5173/dashboard/switches and click "Start Voice Command"!** 🎙️✨
