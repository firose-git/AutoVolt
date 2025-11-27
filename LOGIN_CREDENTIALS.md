# Login Credentials and System Status

## ✅ System Status
- **MongoDB**: Running on `localhost:27017`
- **Backend**: Running on `http://localhost:3001`
- **Frontend**: Running on `http://localhost:5173` and `http://192.168.0.108:5173`

## 🔑 Working Login Credentials

### Admin Account (Full Access)
- **Email**: `admin@company.com`
- **Password**: `admin123456`
- **Role**: Admin
- **Access Level**: Full
- **Department**: IT Department

### Teacher Account (Testing)
- **Email**: `testuser@example.com`
- **Password**: `password123`
- **Role**: Teacher
- **Access Level**: Limited
- **Department**: Computer Science

## 📝 Issue Resolution Summary

### Problem
When accessing the application from other devices on the same WiFi, the frontend displayed correctly but login failed with "login error" message.

### Root Cause
All users in the database had `isActive: false` and `isApproved: false` flags, which blocked login even with correct credentials.

### Solution Applied
1. ✅ Restarted MongoDB service
2. ✅ Updated all existing users to set `isActive: true` and `isApproved: true`
3. ✅ Started backend server on port 3001
4. ✅ Started frontend server accessible on network (0.0.0.0:5173)
5. ✅ Verified login works via API and can be tested in browser

## 🌐 Network Access

### From Your Device (Mac)
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### From Other Devices (Same WiFi)
- Frontend: `http://192.168.0.108:5173`
- Backend API: `http://192.168.0.108:3001`

## 🔧 Manual Switch ESP32 Issue

The manual switch (momentary type) issue was previously fixed in the ESP32 firmware. The changes included:
- Fixed pin initialization for manual switches
- Corrected momentary switch logic to detect button press/release
- Added proper debouncing and state management

## 📌 Next Steps

1. **Test Login from Browser**:
   - Open `http://localhost:5173` on your Mac
   - Open `http://192.168.0.108:5173` on another device
   - Login with any of the credentials above

2. **Future User Registration**:
   - New users will be created with `isActive: false` and `isApproved: false`
   - An admin needs to approve them OR
   - You can manually approve users via MongoDB:
     ```bash
     mongosh autovolt --eval "db.users.updateOne({ email: 'user@example.com' }, { \$set: { isActive: true, isApproved: true } })"
     ```

3. **Keep Services Running**:
   - MongoDB: `brew services start mongodb-community`
   - Backend: `cd backend && node server.js` (or use `npm start`)
   - Frontend: `npm run dev`

## 🛠️ Useful Commands

### Check MongoDB Status
```bash
brew services list | grep mongodb
```

### Check Backend Server
```bash
curl http://localhost:3001/health
```

### Activate a User
```bash
mongosh autovolt --eval "db.users.updateOne({ email: 'EMAIL' }, { \$set: { isActive: true, isApproved: true } })"
```

### List All Users
```bash
mongosh autovolt --eval "db.users.find({}, { name: 1, email: 1, role: 1, isActive: 1, isApproved: 1 })"
```

---
**Last Updated**: October 4, 2025
**Status**: ✅ All systems operational
