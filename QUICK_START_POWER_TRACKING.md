# Quick Start - Power Consumption Tracking

## 🚀 5-Minute Setup Guide

### Step 1: Ensure Database Indexes (Already Done ✅)
```bash
cd backend
npm run db:indexes
```

### Step 2: Configure Power Settings (Optional)
Edit `backend/data/powerSettings.json`:
```json
{
  "electricityPrice": 7.5,
  "deviceTypes": [
    {"type": "light", "powerConsumption": 20},
    {"type": "fan", "powerConsumption": 75},
    {"type": "ac", "powerConsumption": 1200}
  ]
}
```

### Step 3: Start the Server
```bash
cd backend
npm start
```

Look for these log messages:
```
[DEBUG] About to initialize power tracker...
[PowerTracker] Initialized successfully
```

---

## 📱 Using the System

### Turn Switch ON → Tracking Starts
- Click ON button in UI
- Power tracker starts timer
- Check active switches:
  ```bash
  curl http://localhost:3001/api/energy-consumption/active-switches \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

### Turn Switch OFF → Consumption Recorded
- Click OFF button in UI
- Energy and cost calculated automatically
- Data stored in database

---

## 📊 View Consumption Data

### By Classroom
```bash
curl "http://localhost:3001/api/energy-consumption/classroom/LAB-101" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### By ESP32 Device
```bash
curl "http://localhost:3001/api/energy-consumption/device/DEVICE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Overall Summary
```bash
curl "http://localhost:3001/api/energy-consumption/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Quick Verification

### 1. Check Power Tracker is Running
```bash
# Server logs should show:
[PowerTracker] Initialized successfully
```

### 2. Test Switch Toggle
- Turn any switch ON
- Wait 1 minute
- Turn it OFF
- Check consumption API (should show data)

### 3. Verify Database
```javascript
// MongoDB
db.energyconsumptions.find().limit(5).pretty()
db.activitylogs.find({action: "on"}).limit(5).pretty()
```

---

## 📚 Full Documentation

- **[POWER_TRACKING_SYSTEM.md](./POWER_TRACKING_SYSTEM.md)** - Complete guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was built
- **[POWER_CONSUMPTION_ANALYSIS.md](./POWER_CONSUMPTION_ANALYSIS.md)** - System analysis

---

## ✅ What Works Now

- ✅ Real-time power tracking when switches turn ON/OFF
- ✅ User-configured power settings and electricity rates
- ✅ Storage by classroom and ESP32 device
- ✅ Breakdown by device type (light, fan, AC, etc.)
- ✅ Only tracks when ESP32 is online
- ✅ Historical data preserved when offline
- ✅ Incremental data updates (never overwrites)
- ✅ API endpoints for querying consumption

---

**Status**: ✅ Ready to Use  
**Last Updated**: October 29, 2024
