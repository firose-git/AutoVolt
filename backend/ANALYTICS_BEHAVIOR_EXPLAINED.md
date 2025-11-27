# Analytics Behavior - Complete Explanation

## Understanding Power vs Energy

### **Dashboard shows: 3.3kW** (Power - instantaneous)
This is the **current power consumption** - how much electricity your devices are drawing RIGHT NOW.
- Unit: **Watts (W)** or **Kilowatts (kW)**
- Like a car's **speedometer** - shows current speed
- Changes in real-time as devices turn on/off

### **Energy section shows: 1.13 kWh** (Energy - accumulated)
This is the **total energy consumed** over a period of time (today or this month).
- Unit: **Kilowatt-hours (kWh)**
- Like a car's **odometer** - shows total distance traveled
- Accumulates over time

### **The Relationship:**
```
Energy (kWh) = Power (kW) × Time (hours)

Example:
- 3.3 kW running for 1 hour = 3.3 kWh
- 3.3 kW running for 20 minutes = 1.1 kWh ✅ (matches your data!)
```

**Your data is CORRECT!** ✅
- Dashboard: 3300W currently running
- Energy: 1.13 kWh consumed so far today (about 20 minutes of runtime)

---

## Offline Device Behavior

### **Q: Does analytics show data when all devices are offline?**

**Answer: YES! ✅**

The system is designed to show **historical data** regardless of current device status:

```javascript
// Analytics processes ALL devices (not filtered by online status)
const devices = await Device.find({}).lean(); // Gets all devices

// Reads activity logs from when devices WERE online
for (const device of devices) {
  const consumption = await calculatePreciseEnergyConsumption(
    device._id,
    startTime,
    endTime
  ); // Reads historical logs
}
```

### **How it works:**

1. **Activity Logs Persist**: Every switch on/off event is permanently stored
2. **Historical Queries**: Analytics reads these logs regardless of current status
3. **Offline Devices**: Show consumption from when they were online

### **Example Timeline:**
```
Monday 9:00 AM: Device ONLINE, lights ON
Monday 9:00-5:00 PM: Device consuming power (8 hours)
Monday 5:00 PM: Device goes OFFLINE

Tuesday (device still offline):
- Analytics shows Monday's 8 hours of consumption ✅
- Dashboard shows 0W current power (device offline) ✅
- Historical data preserved and visible ✅
```

---

## Individual Device Data

### **Current Implementation (as of latest update):**

#### **✅ DASHBOARD - Shows individual device power**
```json
{
  "devices": [
    {
      "id": "device123",
      "name": "Lab 201 Light",
      "classroom": "Lab 201",
      "status": "online",
      "power": 150,  // Current power in Watts
      "switches": [...]
    }
  ]
}
```

#### **✅ ENERGY SUMMARY - Now includes individual device breakdown**
```json
{
  "daily": {
    "consumption": 1.13,
    "cost": 8.48
  },
  "monthly": {
    "consumption": 45.2,
    "cost": 339.00
  },
  "devices": [  // ⭐ NEW: Individual device breakdown
    {
      "deviceId": "device123",
      "deviceName": "Lab 201 Light",
      "classroom": "Lab 201",
      "status": "online",
      "daily": {
        "consumption": 0.4,    // kWh consumed today
        "cost": 3.00,          // ₹ cost today
        "runtime": 10.5        // hours runtime today
      },
      "monthly": {
        "consumption": 12.5,   // kWh consumed this month
        "cost": 93.75,         // ₹ cost this month
        "runtime": 312.5       // hours runtime this month
      }
    },
    {
      "deviceId": "device456",
      "deviceName": "Lab 201 Fan",
      ...
    }
  ]
}
```

---

## What Analytics Shows

### **1. Dashboard (`/api/analytics/dashboard`)**

**Real-time data:**
- ✅ Total devices (online + offline)
- ✅ Online device count
- ✅ Active devices (consuming power now)
- ✅ Current total power consumption (W)
- ✅ Individual device power draw
- ✅ Daily/Monthly energy costs (from energy summary)

**Example:**
```json
{
  "summary": {
    "totalDevices": 15,
    "onlineDevices": 12,
    "activeDevices": 8,
    "totalPowerConsumption": 3300,  // Current: 3.3kW
    "energyCosts": {
      "dailyINR": 8.48,              // Today: 1.13 kWh × ₹7.5
      "monthlyINR": 339.00           // Month: 45.2 kWh × ₹7.5
    }
  },
  "devices": [/* individual devices */]
}
```

---

### **2. Energy Summary (`/api/analytics/energy-summary`)**

**Historical consumption:**
- ✅ Daily energy consumption (kWh)
- ✅ Monthly energy consumption (kWh)
- ✅ Costs in ₹ INR
- ✅ Runtime (hours)
- ✅ **NEW: Per-device breakdown**

**Includes offline devices:** YES
- Shows data from when they were online
- Runtime calculated from activity logs
- Consumption based on stored power values

---

### **3. Energy Charts (`/api/analytics/energy/{timeframe}`)**

**Time-series data:**
- ✅ Hourly/daily energy consumption
- ✅ Breakdown by classroom
- ✅ Breakdown by device type
- ✅ Cost calculations

**Includes offline devices:** YES
- Historical data from activity logs
- Shows consumption for any time period
- Even if device is currently offline

---

### **4. Energy Calendar (`/api/analytics/energy-calendar/{year}/{month}`)**

**Daily breakdown:**
- ✅ Consumption per day
- ✅ Cost per day
- ✅ Runtime per day
- ✅ Color-coded categories (low/medium/high)

**Includes offline devices:** YES

---

## Data Flow Diagram

```
┌─────────────────┐
│ Device Toggles  │
│   ON/OFF        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  ActivityLog Created    │
│  - timestamp            │
│  - action (on/off)      │
│  - powerConsumption ⭐   │  ← Stored at event time
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  calculatePreciseEnergyConsumption │
│  - Reads activity logs           │
│  - Uses stored power values      │
│  - Calculates kWh consumed       │
└────────┬────────────────────────┘
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    Dashboard  Energy      Charts    Calendar
                Summary
```

---

## Key Features

### ✅ **Historical Accuracy**
- Power consumption stored at event time
- Changing settings doesn't affect past data
- Audit trail preserved

### ✅ **Offline Device Support**
- Historical data always available
- Shows consumption from when online
- Current status doesn't affect historical queries

### ✅ **Individual Device Tracking**
- Each device's consumption tracked separately
- Per-device daily/monthly totals
- Runtime statistics per device

### ✅ **Real-time + Historical**
- Dashboard shows current power (W)
- Analytics shows accumulated energy (kWh)
- Both use same underlying data

---

## API Endpoints Summary

| Endpoint | Shows Offline Device Data? | Individual Devices? |
|----------|---------------------------|---------------------|
| `/api/analytics/dashboard` | ✅ YES (historical) | ✅ YES (power) |
| `/api/analytics/energy-summary` | ✅ YES | ✅ YES (consumption) |
| `/api/analytics/energy/{timeframe}` | ✅ YES | ⚠️ By classroom/type |
| `/api/analytics/energy-calendar/{y}/{m}` | ✅ YES | ❌ Total only |
| `/api/analytics/device-usage/{timeframe}` | ⚠️ NO (online only) | ✅ YES |

---

## Testing Individual Device Data

### **Frontend Example:**
```javascript
// Fetch energy summary with individual device breakdown
const response = await fetch('/api/analytics/energy-summary');
const data = await response.json();

// Display individual device consumption
data.devices.forEach(device => {
  console.log(`${device.deviceName}:`);
  console.log(`  Today: ${device.daily.consumption} kWh (₹${device.daily.cost})`);
  console.log(`  Month: ${device.monthly.consumption} kWh (₹${device.monthly.cost})`);
  console.log(`  Runtime: ${device.daily.runtime} hours today`);
});
```

### **Sample Output:**
```
Lab 201 Light:
  Today: 0.4 kWh (₹3.00)
  Month: 12.5 kWh (₹93.75)
  Runtime: 10.5 hours today

Lab 201 Fan:
  Today: 0.6 kWh (₹4.50)
  Month: 18.0 kWh (₹135.00)
  Runtime: 8 hours today

Projector Room 1:
  Today: 0.13 kWh (₹0.98) 
  Month: 14.7 kWh (₹110.25)
  Runtime: 0.65 hours today
```

---

## Common Scenarios

### **Scenario 1: All Devices Offline**
```
Current Status: All devices offline
Dashboard: Shows 0W current power ✅
Analytics: Shows historical consumption ✅
Individual devices: Show past consumption ✅
```

### **Scenario 2: Mixed Online/Offline**
```
Current Status: 5 online, 10 offline
Dashboard: Shows power from 5 online devices ✅
Analytics: Shows consumption from all 15 devices ✅
Individual: Shows each device's consumption ✅
```

### **Scenario 3: Change Power Settings**
```
Before: Light = 40W, consumed 0.4 kWh yesterday
Action: Change light to 60W today
Result:
  - Yesterday's data: Still 0.4 kWh ✅
  - Today's data: Uses 60W ✅
  - Historical accuracy preserved ✅
```

---

## Summary

**✅ Yes to all your questions:**

1. **Analytics shows data when devices offline?** YES - reads historical activity logs
2. **Shows individual device data?** YES - device breakdown now included
3. **Power vs Energy confusion?** CLARIFIED - they measure different things

**Your current readings are correct:**
- Dashboard: 3.3kW = current power draw
- Energy: 1.13 kWh = energy consumed over ~20 minutes

---

**Last Updated:** October 27, 2025  
**Version:** 2.0 with Individual Device Breakdown
