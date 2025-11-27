# Real-Time Power Consumption Tracking System

## Overview

This document describes the **real-time power consumption tracking system** that monitors and records energy usage when devices (lights, fans, AC, etc.) are turned ON, calculates costs based on user-configured settings, and stores data by classroom and ESP32 device.

---

## 🎯 Key Features

### ✅ Real-Time Tracking
- **Starts counting when switch turns ON** - Timer begins immediately
- **Stops counting when switch turns OFF** - Records total consumption
- **Only tracks when ESP32 is ONLINE** - No counting during offline periods
- **Automatic offline handling** - Stops all active trackers when device disconnects

### ✅ User-Configurable Settings
- **Power consumption per device type** (lights, fans, AC, projectors, outlets)
- **Electricity rate** (₹ per kWh)
- **Settings loaded from** `backend/data/powerSettings.json`

### ✅ Comprehensive Data Storage
- **By ESP32 Device** - Track each individual device's consumption
- **By Classroom** - Aggregate all devices in a classroom
- **By Switch Type** - Breakdown by light, fan, AC, etc.
- **Incremental Updates** - New data is ADDED to existing data (never overwritten)

### ✅ Historical Data Preservation
- **Offline devices** - Historical data remains accessible
- **Daily records** - Separate entry for each day
- **Time-series queries** - Query by date range

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER ACTIONS                              │
│  (Web UI, Manual Switch, Schedule, PIR)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              deviceController.toggleSwitch()                     │
│  - Updates switch state in database                             │
│  - Creates activity log entry                                   │
│  - Publishes MQTT command to ESP32                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│           powerConsumptionTracker Service                        │
│                                                                  │
│  ON:  trackSwitchOn()  → Start timer, record start time         │
│  OFF: trackSwitchOff() → Calculate consumption, store in DB     │
│                                                                  │
│  OFFLINE: handleDeviceOffline() → Stop all active trackers      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                Database Collections                              │
│                                                                  │
│  ActivityLog: Every switch event (ON/OFF) with power rating     │
│  EnergyConsumption: Daily aggregated data by device/classroom   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **powerConsumptionTracker.js** - Core tracking service
   - Manages active switch timers
   - Calculates energy consumption (kWh)
   - Stores data incrementally

2. **EnergyConsumption Model** - Data storage
   - Daily records per device
   - Breakdown by switch type
   - Classroom aggregation

3. **ActivityLog Model** - Event logging
   - Enhanced with `switchType` and `macAddress` fields
   - Tracks every ON/OFF event
   - Power consumption at event time

4. **energyConsumption Routes** - API endpoints
   - Query by classroom
   - Query by ESP32 device
   - Get active switches
   - Compare consumption

---

## 📊 Database Schema

### EnergyConsumption Collection

```javascript
{
  deviceId: ObjectId,           // Reference to Device
  deviceName: "ESP32-LAB-101",
  macAddress: "AA:BB:CC:DD:EE:FF",
  
  classroom: "LAB-101",
  location: "Ground Floor",
  
  date: ISODate("2024-10-29T00:00:00Z"),
  year: 2024,
  month: 10,
  day: 29,
  
  // Breakdown by device type
  consumptionByType: {
    light: {
      energyKwh: 1.5,
      runtimeHours: 6.5,
      cost: 11.25,
      switchCount: 4
    },
    fan: {
      energyKwh: 2.8,
      runtimeHours: 8.0,
      cost: 21.00,
      switchCount: 2
    },
    // ... ac, projector, outlet, other
  },
  
  // Daily totals
  totalEnergyKwh: 4.3,
  totalRuntimeHours: 14.5,
  totalCost: 32.25,
  
  electricityRate: 7.5,  // ₹ per kWh
  wasOnline: true,
  lastUpdated: ISODate("2024-10-29T18:30:00Z")
}
```

### ActivityLog Collection (Enhanced)

```javascript
{
  deviceId: ObjectId,
  deviceName: "ESP32-LAB-101",
  switchId: "switch_001",
  switchName: "Light 1",
  action: "on",  // or "off", "manual_on", "manual_off"
  
  triggeredBy: "user",  // or "schedule", "pir", "manual_switch"
  userId: ObjectId,
  userName: "John Doe",
  
  classroom: "LAB-101",
  location: "Ground Floor",
  
  timestamp: ISODate("2024-10-29T10:30:00Z"),
  
  // NEW FIELDS
  powerConsumption: 20,     // Watts at event time
  switchType: "light",      // light, fan, ac, projector, outlet
  macAddress: "AA:BB:CC:DD:EE:FF",
  
  duration: 3600,           // seconds (for OFF events)
  
  context: {
    energyKwh: 0.02,       // Calculated for OFF events
    cost: 0.15,            // ₹ INR
    runtimeHours: 1.0
  }
}
```

---

## 🔧 Configuration

### Power Settings File: `backend/data/powerSettings.json`

```json
{
  "electricityPrice": 7.5,
  "deviceTypes": [
    {
      "type": "light",
      "powerConsumption": 20,
      "unit": "W",
      "description": "LED/CFL bulbs"
    },
    {
      "type": "fan",
      "powerConsumption": 75,
      "unit": "W",
      "description": "Ceiling/table fans"
    },
    {
      "type": "ac",
      "powerConsumption": 1200,
      "unit": "W",
      "description": "Air conditioner 1.5 ton"
    },
    {
      "type": "projector",
      "powerConsumption": 250,
      "unit": "W",
      "description": "LCD/LED projectors"
    },
    {
      "type": "outlet",
      "powerConsumption": 100,
      "unit": "W",
      "description": "Generic outlets/sockets"
    }
  ]
}
```

**To modify settings:**
1. Edit `backend/data/powerSettings.json`
2. Changes are auto-reloaded every 30 seconds
3. Alternatively, restart the backend server

---

## 📡 API Endpoints

### 1. Get Classroom Consumption

```bash
GET /api/energy-consumption/classroom/:classroom
Query Params:
  - startDate: ISO date (optional, default: 30 days ago)
  - endDate: ISO date (optional, default: today)
  - groupBy: 'day' | 'week' | 'month' | 'year' (default: 'day')

Example:
GET /api/energy-consumption/classroom/LAB-101?startDate=2024-10-01&endDate=2024-10-31&groupBy=day

Response:
{
  "success": true,
  "data": {
    "classroom": "LAB-101",
    "period": { "startDate": "2024-10-01", "endDate": "2024-10-31" },
    "summary": {
      "totalEnergy": 120.5,
      "totalCost": 903.75,
      "byType": { ... }
    },
    "records": [
      {
        "period": "2024-10-01",
        "totalEnergyKwh": 4.2,
        "totalCost": 31.50,
        "totalRuntimeHours": 12.5
      },
      // ... more days
    ]
  }
}
```

### 2. Get ESP32 Device Consumption

```bash
GET /api/energy-consumption/device/:deviceId
Query Params: Same as classroom endpoint

Response:
{
  "success": true,
  "data": {
    "deviceId": "507f1f77bcf86cd799439011",
    "period": { ... },
    "summary": {
      "totalEnergyKwh": 45.2,
      "totalCost": 339.00,
      "averageDailyCost": 10.97
    },
    "byType": {
      "light": { "energyKwh": 12.5, "cost": 93.75, "runtimeHours": 50 },
      "fan": { "energyKwh": 32.7, "cost": 245.25, "runtimeHours": 120 }
    },
    "records": [ ... ]
  }
}
```

### 3. Get Active Switches (Real-Time)

```bash
GET /api/energy-consumption/active-switches

Response:
{
  "success": true,
  "data": {
    "count": 8,
    "switches": [
      {
        "switchId": "switch_001",
        "switchName": "Light 1",
        "deviceName": "ESP32-LAB-101",
        "classroom": "LAB-101",
        "powerWatts": 20,
        "runtimeSeconds": 3600,
        "estimatedCost": 0.15
      },
      // ... more active switches
    ],
    "totalPowerWatts": 450,
    "totalEstimatedCost": 3.38
  }
}
```

### 4. Get Overall Summary

```bash
GET /api/energy-consumption/summary
Query Params:
  - startDate: ISO date (optional, default: start of current month)
  - endDate: ISO date (optional, default: today)

Response:
{
  "success": true,
  "data": {
    "period": { ... },
    "overall": {
      "totalEnergyKwh": 450.5,
      "totalCost": 3378.75,
      "totalRuntimeHours": 1200,
      "uniqueDevices": 15,
      "uniqueClassrooms": 8
    },
    "byClassroom": [
      { "classroom": "LAB-101", "energyKwh": 120.5, "cost": 903.75, "deviceCount": 2 },
      { "classroom": "LAB-102", "energyKwh": 98.3, "cost": 737.25, "deviceCount": 2 }
    ],
    "byType": [
      { "type": "fan", "energyKwh": 180.5, "cost": 1353.75, "runtimeHours": 650 },
      { "type": "light", "energyKwh": 150.2, "cost": 1126.50, "runtimeHours": 400 }
    ]
  }
}
```

### 5. Compare Consumption

```bash
GET /api/energy-consumption/comparison
Query Params:
  - type: 'classroom' | 'device'
  - entities: Comma-separated list (e.g., "LAB-101,LAB-102,LAB-103")
  - startDate, endDate

Example:
GET /api/energy-consumption/comparison?type=classroom&entities=LAB-101,LAB-102

Response:
{
  "success": true,
  "data": {
    "period": { ... },
    "comparison": [
      {
        "entity": "LAB-101",
        "type": "classroom",
        "totalEnergyKwh": 120.5,
        "totalCost": 903.75,
        "averageDailyCost": 30.13,
        "days": 30
      },
      {
        "entity": "LAB-102",
        "type": "classroom",
        "totalEnergyKwh": 98.3,
        "totalCost": 737.25,
        "averageDailyCost": 24.58,
        "days": 30
      }
    ]
  }
}
```

---

## 🔄 How It Works

### Step-by-Step Flow

#### 1. **Switch Turned ON**

```
User clicks ON button in UI
    ↓
deviceController.toggleSwitch() called
    ↓
Database: Update switch state = true
    ↓
ActivityLog: Create entry { action: "on", powerConsumption: 20W, switchType: "light" }
    ↓
powerTracker.trackSwitchOn() called
    ↓
Check if ESP32 is ONLINE
    ├─ YES: Start timer, record { startTime, powerWatts, switchType }
    └─ NO:  Skip tracking, log as offline
    ↓
MQTT: Publish command to ESP32
    ↓
ESP32: Physically turns ON the relay
```

#### 2. **Switch Turned OFF**

```
User clicks OFF button in UI
    ↓
deviceController.toggleSwitch() called
    ↓
Database: Update switch state = false
    ↓
powerTracker.trackSwitchOff() called
    ↓
Calculate:
  - runtimeMs = endTime - startTime
  - runtimeHours = runtimeMs / (3600 * 1000)
  - energyKwh = (powerWatts * runtimeHours) / 1000
  - cost = energyKwh * electricityRate
    ↓
EnergyConsumption.incrementConsumption() called
    ↓
Database: UPSERT record for today
  - Find record for (deviceId, date)
  - $inc: Add energyKwh, cost, runtimeHours to existing values
  - $inc: Update consumptionByType.light
    ↓
ActivityLog: Create entry { action: "off", duration, context: { energyKwh, cost } }
    ↓
MQTT: Publish command to ESP32
    ↓
ESP32: Physically turns OFF the relay
```

#### 3. **ESP32 Goes Offline**

```
deviceMonitoringService detects offline
    ↓
Check if status changed from online → offline
    ↓
powerTracker.handleDeviceOffline() called
    ↓
For each active switch on this device:
  - Calculate consumption up to offline time
  - Store in EnergyConsumption
  - Create ActivityLog entry with reason: "device_offline"
  - Remove from active tracking
    ↓
WebSocket: Emit 'device_disconnected' event
    ↓
Frontend: Show device as offline, stop real-time updates
```

---

## 🧪 Testing

### 1. Test Switch ON/OFF Tracking

```bash
# Turn switch ON
curl -X PATCH http://localhost:3001/api/devices/:deviceId/switches/:switchId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": true}'

# Wait 5 minutes (simulated runtime)

# Turn switch OFF
curl -X PATCH http://localhost:3001/api/devices/:deviceId/switches/:switchId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": false}'

# Verify consumption recorded
curl http://localhost:3001/api/energy-consumption/active-switches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Offline Handling

```bash
# Simulate device going offline (manually update in DB or disconnect ESP32)

# Check active switches - should be empty for that device
curl http://localhost:3001/api/energy-consumption/active-switches \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify consumption was recorded in ActivityLog
curl http://localhost:3001/api/activity-logs?deviceId=DEVICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Classroom Report

```bash
# Get last 7 days consumption for LAB-101
curl "http://localhost:3001/api/energy-consumption/classroom/LAB-101?startDate=2024-10-22&endDate=2024-10-29" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return daily breakdown with totals
```

---

## 📈 Data Visualization

### Frontend Integration Example

```typescript
// Fetch classroom consumption
const getClassroomEnergy = async (classroom: string) => {
  const response = await fetch(
    `/api/energy-consumption/classroom/${classroom}?groupBy=day`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const { data } = await response.json();
  
  // Use in Recharts
  return data.records.map(record => ({
    date: record.period,
    energy: record.totalEnergyKwh,
    cost: record.totalCost
  }));
};

// Display in chart
<BarChart data={await getClassroomEnergy("LAB-101")}>
  <XAxis dataKey="date" />
  <YAxis />
  <Bar dataKey="energy" fill="#3b82f6" name="Energy (kWh)" />
  <Bar dataKey="cost" fill="#10b981" name="Cost (₹)" />
</BarChart>
```

---

## ⚙️ Database Indexes

The following indexes are automatically created for optimal performance:

### ActivityLog
```javascript
{ deviceId: 1, timestamp: -1 }
{ deviceId: 1, action: 1, timestamp: -1 }  // NEW: For consumption queries
{ classroom: 1, action: 1, timestamp: -1 }  // NEW: Classroom aggregation
{ macAddress: 1, timestamp: -1 }            // NEW: ESP32 tracking
```

### EnergyConsumption
```javascript
{ deviceId: 1, date: -1 }
{ macAddress: 1, date: -1 }
{ classroom: 1, date: -1 }
{ year: 1, month: 1, day: 1 }
{ classroom: 1, year: 1, month: 1 }
```

**To create indexes:**
```bash
cd backend
npm run db:indexes
```

---

## 🚨 Important Notes

### ✅ Data Integrity

1. **Incremental Storage**: `$inc` operator ensures data is ADDED, never overwritten
2. **Idempotent**: Calling `trackSwitchOff()` multiple times won't duplicate consumption
3. **Atomic Operations**: Database updates use findOneAndUpdate with upsert

### ✅ Offline Behavior

- **While Offline**: No new consumption is tracked
- **Historical Data**: Remains intact and queryable
- **Reconnection**: Switches that were ON before offline are NOT automatically tracked (user must toggle again)

### ✅ Performance

- **Active Switch Tracking**: In-memory Map (no database queries during tracking)
- **Batch Updates**: Single database write per switch OFF event
- **Indexed Queries**: All API endpoints use indexed fields

### ✅ Cost Calculation

```
Energy (kWh) = Power (W) × Time (hours) ÷ 1000
Cost (₹) = Energy (kWh) × Electricity Rate (₹/kWh)

Example:
  Power: 75W (fan)
  Time: 2 hours
  Rate: ₹7.5/kWh
  
  Energy = 75 × 2 ÷ 1000 = 0.15 kWh
  Cost = 0.15 × 7.5 = ₹1.125
```

---

## 🔗 Related Files

### Core Files
- `backend/services/powerConsumptionTracker.js` - Main tracking service
- `backend/models/EnergyConsumption.js` - Data model
- `backend/models/ActivityLog.js` - Enhanced event logging
- `backend/routes/energyConsumption.js` - API endpoints

### Integration Points
- `backend/controllers/deviceController.js` - Switch toggle integration
- `backend/services/deviceMonitoringService.js` - Offline detection
- `backend/server.js` - Service initialization

### Configuration
- `backend/data/powerSettings.json` - Power consumption settings
- `backend/scripts/createIndexes.js` - Database index creation

---

## 📚 Further Reading

- [POWER_CONSUMPTION_ANALYSIS.md](./POWER_CONSUMPTION_ANALYSIS.md) - Detailed analysis of existing system
- [ANALYTICS_BEHAVIOR_EXPLAINED.md](./ANALYTICS_BEHAVIOR_EXPLAINED.md) - Power vs Energy concepts
- [ARCHITECTURE_IMPROVEMENTS.md](./backend/ARCHITECTURE_IMPROVEMENTS.md) - Architecture fixes

---

**Last Updated**: October 29, 2024  
**Version**: 1.0  
**Status**: Production Ready ✅
