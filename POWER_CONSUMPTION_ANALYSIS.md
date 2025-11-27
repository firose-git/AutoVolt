# Power Consumption Feature - Complete Analysis

## Executive Summary

This document provides a comprehensive analysis of the power consumption calculation system, charting implementation, and identified issues across the AutoVolt IoT automation system.

---

## 🏗️ System Architecture Overview

### Data Flow
```
ESP32 Devices → MQTT → Backend → Database (ActivityLog) → Calculations → Charts
     ↓                                                           ↓
Manual/Auto Switch Events                            Dashboard/Analytics Display
```

### Key Components
1. **Data Collection**: MQTT messages from ESP32 devices
2. **Storage**: MongoDB collections (ActivityLog, PowerReading, Device)
3. **Calculation**: `metricsService.js` - Power consumption calculations
4. **Visualization**: React charts in Dashboard and Analytics pages

---

## 📊 Chart Locations & Implementation

### 1. **Dashboard Charts** (`src/pages/Index.tsx`)
**Location**: Main dashboard at `/dashboard`

**Charts Present**:
- Real-time power consumption gauge
- Online/Offline device counts
- Daily/Monthly energy costs (₹ INR)

**Data Source**:
```javascript
GET /api/analytics/dashboard
Response: {
  summary: {
    totalPowerConsumption: 3300, // Watts
    energyCosts: {
      dailyINR: 8.48,
      monthlyINR: 339.00,
      dailyConsumption: 1.13, // kWh
      monthlyConsumption: 45.2 // kWh
    }
  }
}
```

**Issues**:
- ❌ **Mismatch between current power and accumulated energy**: Shows 3.3kW current but only 1.13kWh consumed
- ✅ **This is CORRECT behavior** (20 minutes runtime: 3.3kW × 0.33h = 1.1kWh)

---

### 2. **Energy Monitoring Dashboard** (`src/components/EnergyMonitoringDashboard.tsx`)
**Location**: `/dashboard` (embedded component)

**Charts Present**:
- **Energy Consumption Trend** (Bar Chart)
  - Day view: 24-hour breakdown
  - Month view: Daily consumption
  - Year view: Monthly consumption
  
- **Cost Analysis** (Line Chart)
  - Cost trends over time
  - Currency: ₹ INR

**Data Source**:
```javascript
GET /api/analytics/energy/{timeframe}
Timeframes: 1h, 24h, 7d, 30d, 90d
```

**Implementation**:
```typescript
<BarChart data={getFormattedChartData()}>
  <Bar dataKey="consumption" fill="#3b82f6" name="Energy (kWh)" />
</BarChart>

<LineChart data={getFormattedChartData()}>
  <Line dataKey="cost" stroke="#10b981" name="Cost (₹)" />
</LineChart>
```

**Issues**:
- ✅ Charts correctly display cumulative daily consumption
- ✅ Historical data persists (not overwritten)
- ⚠️ **Calendar view** not fully implemented in frontend

---

### 3. **Analytics Page - Energy Tab** (`src/components/AnalyticsPanel.tsx`)
**Location**: `/dashboard/analytics` → Energy Tab

**Charts Present**:
- **Energy Usage Over Time** (Area Chart)
  - Shows power consumption trends
  - Timeframes: 24h, 7d, 30d
  
**Data Source**:
```javascript
GET /api/analytics/energy/{timeframe}
```

**Implementation**:
```typescript
<AreaChart data={energyData?.map((item) => ({
  ...item,
  totalConsumption: item.totalConsumption || 0
}))}>
  <Area 
    type="monotone" 
    dataKey="totalConsumption" 
    stroke="#8884d8" 
    fill="#8884d8" 
  />
</AreaChart>
```

**Issues**:
- ✅ Correctly shows time-series consumption data
- ✅ Handles zero consumption periods
- ✅ Includes offline device historical data

---

### 4. **Grafana Dashboards** (`grafana-autovolt-dashboard.json`)
**Location**: External Grafana at `http://localhost:3000`

**Charts Present**:
- ESP32 device power usage
- Daily energy consumption by device
- Monthly energy consumption
- System power factor efficiency

**Data Source**: Prometheus metrics from `/api/analytics/metrics`

**Key Metrics**:
```
esp32_power_usage_watts{device_id, device_name, classroom}
esp32_energy_consumption_daily_kwh{device_id, device_name}
esp32_energy_consumption_monthly_kwh{device_id, device_name}
```

**Issues**:
- ⚠️ Prometheus metrics update every 15 seconds
- ⚠️ May show stale data during device offline periods
- ✅ Historical data preserved in Prometheus TSDB

---

## 🔢 Power Consumption Calculation Methods

### Method 1: Real-Time Instantaneous Power
**Function**: `calculateDevicePowerConsumption(device)`
**Location**: `backend/metricsService.js:1199-1265`

```javascript
function calculateDevicePowerConsumption(device) {
  if (!device.switches || device.switches.length === 0) return 0;
  
  let totalPower = 0;
  device.switches.forEach(sw => {
    if (sw.state) { // Only if switch is ON
      const basePower = getBasePowerConsumption(sw.name, sw.type);
      totalPower += basePower;
    }
  });
  
  return totalPower; // Returns Watts
}
```

**Used For**:
- Dashboard current power display
- Real-time metrics
- Prometheus gauges

**Pros**:
- ✅ Fast, no database queries
- ✅ Accurate for current state

**Cons**:
- ❌ Doesn't account for history
- ❌ Assumes constant power (no variations)

---

### Method 2: Precise Energy Consumption (Historical)
**Function**: `calculatePreciseEnergyConsumption(deviceId, startTime, endTime)`
**Location**: `backend/metricsService.js:1276-1383`

```javascript
async function calculatePreciseEnergyConsumption(deviceId, startTime, endTime) {
  // 1. Get all switch on/off events from ActivityLog
  const activities = await ActivityLog.find({
    deviceId: deviceId,
    timestamp: { $gte: startTime, $lte: endTime },
    action: { $in: ['on', 'off', 'manual_on', 'manual_off'] }
  }).sort({ timestamp: 1 });
  
  // 2. Calculate energy for each time period
  let totalEnergyKwh = 0;
  let currentPower = 0;
  let lastTimestamp = startTime;
  
  for (const activity of activities) {
    // Calculate energy = Power × Time
    const durationHours = (activity.timestamp - lastTimestamp) / (1000 * 60 * 60);
    totalEnergyKwh += (currentPower * durationHours) / 1000;
    
    // Update current power based on switch change
    if (activity.action.includes('on')) {
      currentPower += activity.powerConsumption;
    } else {
      currentPower -= activity.powerConsumption;
    }
    
    lastTimestamp = activity.timestamp;
  }
  
  return totalEnergyKwh; // Returns kWh
}
```

**Used For**:
- Energy summary API
- Historical charts
- Cost calculations

**Pros**:
- ✅ Accurate based on actual usage
- ✅ Accounts for on/off patterns
- ✅ Includes offline device history

**Cons**:
- ❌ Slower (database queries)
- ❌ Depends on ActivityLog accuracy

---

### Method 3: Estimated Energy (Fallback)
**Function**: `calculateEnergyConsumption(powerWatts, durationHours)`
**Location**: `backend/metricsService.js:1270-1273`

```javascript
function calculateEnergyConsumption(powerWatts, durationHours) {
  // Energy (kWh) = Power (W) × Time (h) ÷ 1000
  return (powerWatts * durationHours) / 1000;
}
```

**Used For**:
- Estimates when no activity logs exist
- Dashboard fallback calculations

**Formula**:
```
Energy (kWh) = Power (W) × Time (hours) ÷ 1000

Example:
- 3300W running for 1 hour = 3.3 kWh
- 3300W running for 20 minutes = 3300 × (20/60) ÷ 1000 = 1.1 kWh ✅
```

---

## ⚠️ Issues Identified

### 1. **Dashboard Energy Cost Calculation Inconsistency**
**File**: `backend/metricsService.js:1596-1625`

**Problem**:
```javascript
// OLD METHOD (Inconsistent)
const dailyEnergyCost = calculateEnergyCostINR(totalPowerConsumption, 24);
const monthlyEnergyCost = calculateEnergyCostINR(totalPowerConsumption, 720);
// Assumes constant power for full period
```

**Impact**:
- Dashboard shows different values than Analytics
- Overestimates cost if devices aren't running 24/7
- Not accurate for intermittent usage

**Fix Applied** (Lines 1606-1625):
```javascript
// NEW METHOD (Consistent)
const energySummary = await getEnergySummary();
dailyEnergyCost = energySummary.daily.cost;
monthlyEnergyCost = energySummary.monthly.cost;
// Uses actual consumption from ActivityLog
```

**Status**: ✅ **FIXED**

---

### 2. **Power vs Energy Confusion**
**Location**: Dashboard and Analytics displays

**Problem**:
Users see:
- Dashboard: "3.3kW"
- Energy section: "1.13 kWh"

They expect these to match, but they measure different things.

**Explanation**:
```
Power (kW) = Instantaneous rate (like speedometer)
Energy (kWh) = Accumulated consumption (like odometer)

Relationship:
Energy = Power × Time

Example:
- 3.3 kW running for 20 minutes = 1.1 kWh ✅ CORRECT
```

**Fix**: ℹ️ **Documentation** (not a bug)

**Status**: ✅ **Clarified in ANALYTICS_BEHAVIOR_EXPLAINED.md**

---

### 3. **Offline Device Data Visibility**
**Location**: All chart endpoints

**Expected Behavior**:
✅ Charts SHOULD show historical data from offline devices

**Actual Behavior**:
- ✅ `/api/analytics/energy-summary` - Includes offline device history
- ✅ `/api/analytics/energy/{timeframe}` - Includes offline device history
- ❌ `/api/analytics/device-usage/{timeframe}` - Only shows online devices

**Problem Function**: `getDeviceUsageData(timeframe)` - Line 1873-1930

```javascript
// ISSUE: Filters only online devices
const devices = await Device.find({ status: 'online' }).lean();
```

**Fix**:
```javascript
// SHOULD: Include all devices but mark status
const devices = await Device.find({}).lean();
```

**Status**: ⚠️ **NEEDS FIX**

---

### 4. **Missing Database Indexes on ActivityLog**
**Location**: `backend/models/ActivityLog.js`

**Problem**: Heavy queries on ActivityLog for consumption calculations

**Current Indexes**:
```javascript
✅ { deviceId: 1, timestamp: -1 }
✅ { userId: 1, timestamp: -1 }
✅ { classroom: 1, timestamp: -1 }
```

**Missing Index** (would improve performance):
```javascript
❌ { deviceId: 1, action: 1, timestamp: -1 }
```

**Impact**:
- Slower queries when calculating precise consumption
- Full collection scan on action filter

**Fix**:
```javascript
activityLogSchema.index({ deviceId: 1, action: 1, timestamp: -1 });
```

**Status**: ⚠️ **RECOMMENDED IMPROVEMENT**

---

### 5. **Power Settings Not Synced Across Services**
**Location**: `backend/data/powerSettings.json`

**Problem**:
- Dashboard reloads power settings every 30 seconds
- Metrics service caches for 10 seconds
- Race condition when settings change

**Code**:
```javascript
// File: backend/metricsService.js:557
setInterval(loadPowerSettings, 30000); // 30 seconds

// File: backend/metricsService.js:563
const dashboardCache = {
  ttl: 10000 // 10 seconds cache
};
```

**Impact**:
- Temporary mismatch between dashboard and charts
- Settings change may not reflect immediately

**Fix**:
```javascript
// Option 1: Emit event when settings change
powerSettingsService.on('change', () => {
  dashboardCache.data = null; // Invalidate cache
  loadPowerSettings(); // Reload immediately
});

// Option 2: Synchronize cache TTL
const CACHE_TTL = 30000; // Use same for both
```

**Status**: ⚠️ **MINOR ISSUE**

---

### 6. **Calendar View Not Fully Implemented**
**Location**: `src/components/EnergyMonitoringDashboard.tsx`

**Problem**:
- Backend API exists: `/api/analytics/energy-calendar/:year/:month`
- Frontend calendar component not rendered in production build

**Backend API** (Working):
```javascript
GET /api/analytics/energy-calendar/2024/10
Response: {
  month: 10,
  year: 2024,
  days: [
    { date: "2024-10-01", consumption: 12.5, cost: 93.75, runtime: 8 },
    { date: "2024-10-02", consumption: 14.2, cost: 106.50, runtime: 9 }
  ],
  totalCost: 3150.00,
  totalConsumption: 420.5
}
```

**Frontend** (Not implemented):
- Calendar grid should show daily consumption with color coding
- Click on day should show hourly breakdown

**Status**: ❌ **INCOMPLETE FEATURE**

---

### 7. **Chart Data Pagination Missing**
**Location**: All chart endpoints

**Problem**:
- Large date ranges return huge datasets
- No pagination on chart endpoints
- Can cause performance issues

**Example**:
```javascript
GET /api/power-analytics/daily/:deviceId?startDate=2020-01-01&endDate=2024-12-31
// Returns 1825 days of data (5 years) with no pagination
```

**Fix**:
```javascript
// Add pagination support
GET /api/power-analytics/daily/:deviceId?startDate=...&page=1&limit=100

Response: {
  data: [...],
  pagination: {
    page: 1,
    limit: 100,
    total: 1825,
    pages: 19,
    hasMore: true
  }
}
```

**Status**: ✅ **PARTIAL FIX** (pagination exists but not enforced)

---

## 📈 How Charts Work

### Dashboard Real-Time Updates

```mermaid
graph LR
    A[ESP32 Device] -->|MQTT| B[Backend]
    B -->|Update DB| C[Device/ActivityLog]
    C -->|Query| D[calculatePreciseEnergyConsumption]
    D -->|Data| E[Dashboard API]
    E -->|WebSocket| F[React Chart]
    F -->|Re-render| G[User sees update]
```

**Update Frequency**:
- MQTT messages: Real-time (when switches change)
- Metrics update: Every 15 seconds
- Dashboard cache: 10 seconds TTL
- Frontend polling: Every 30 seconds (configurable)

---

### Energy Summary Calculation Flow

**Step 1**: Get device list
```javascript
const devices = await Device.find({}).lean();
```

**Step 2**: For each device, calculate consumption
```javascript
const todayStart = new Date().setHours(0,0,0,0);
const now = new Date();

for (const device of devices) {
  const consumption = await calculatePreciseEnergyConsumption(
    device._id, 
    todayStart, 
    now
  );
  
  totalConsumption += consumption;
  totalCost += consumption * electricityPrice;
}
```

**Step 3**: Return aggregated data
```javascript
return {
  daily: { consumption, cost, runtime },
  monthly: { consumption, cost, runtime },
  devices: deviceBreakdown[]
}
```

---

### Chart Data Transformation

**Backend to Frontend**:
```javascript
// Backend returns:
{
  timestamp: "2024-10-29T10:00:00Z",
  totalConsumption: 1.234,
  costINR: 9.26
}

// Frontend transforms for chart:
{
  label: "10:00 AM",
  consumption: 1.234,
  cost: 9.26
}
```

**Recharts Configuration**:
```typescript
<BarChart data={chartData}>
  <XAxis dataKey="label" />
  <YAxis label={{ value: 'Energy (kWh)', angle: -90 }} />
  <Bar dataKey="consumption" fill="#3b82f6" />
</BarChart>
```

---

## 🎯 Recommendations

### Immediate Fixes (High Priority)

1. **Fix device-usage endpoint** to include offline device history
   ```javascript
   // Change from:
   const devices = await Device.find({ status: 'online' });
   // To:
   const devices = await Device.find({});
   ```

2. **Add composite index** for faster ActivityLog queries
   ```javascript
   activityLogSchema.index({ deviceId: 1, action: 1, timestamp: -1 });
   ```

3. **Implement calendar view** in frontend
   - Use existing backend API
   - Add color-coded daily consumption grid
   - Enable drill-down to hourly data

### Medium Priority

4. **Synchronize power settings cache** across services
   - Use Redis for shared cache (if available)
   - Or emit events on settings change

5. **Add chart data pagination enforcement**
   - Limit max date range without pagination
   - Return error if too much data requested

6. **Add data export functionality**
   - CSV export for charts
   - PDF reports for energy consumption

### Long-term Improvements

7. **Implement data aggregation service**
   - Pre-calculate daily/monthly totals
   - Store in separate collection
   - Faster chart loading

8. **Add real-time WebSocket updates** for charts
   - Push updates instead of polling
   - Reduce server load

9. **Implement chart caching**
   - Cache chart data on client side
   - Incremental updates only

---

## 📊 Current State Summary

### What's Working ✅
- Real-time power monitoring
- Historical energy consumption tracking
- Multiple chart types (Bar, Line, Area)
- Cost calculations in ₹ INR
- ActivityLog-based precise calculations
- Grafana integration
- Dashboard and Analytics pages
- Mobile-responsive charts

### What's Broken/Missing ❌
- Device-usage endpoint excludes offline devices
- Calendar view not implemented in frontend
- Chart data pagination not enforced
- Power settings cache race condition
- Missing composite indexes

### What's Confusing ℹ️
- Power (kW) vs Energy (kWh) terminology
- Dashboard cache vs Metrics cache timing
- Multiple calculation methods for energy

---

## 🧪 Testing Guide

### Verify Power Calculations

**Test 1: Real-time power**
```bash
# Get device with 3 lights ON (20W each)
curl http://localhost:3001/api/analytics/dashboard

# Expected: totalPowerConsumption = 60W
```

**Test 2: Historical energy**
```bash
# Device ran for 2 hours at 60W
curl http://localhost:3001/api/analytics/energy-summary

# Expected: consumption = 0.12 kWh (60W × 2h ÷ 1000)
```

**Test 3: Cost calculation**
```bash
# At ₹7.50/kWh, 0.12 kWh should cost
# Expected: cost = ₹0.90
```

### Verify Chart Data

**Test 1: Daily chart**
```bash
GET /api/power-analytics/daily/DEVICE_ID?startDate=2024-10-01&endDate=2024-10-31

# Should return 31 days of data
# Each day should show cumulative consumption for that day
```

**Test 2: Energy timeline**
```bash
GET /api/analytics/energy/24h

# Should return hourly breakdown for last 24 hours
# totalConsumption should increase over time (cumulative)
```

---

## 📚 Related Documentation

1. **ANALYTICS_BEHAVIOR_EXPLAINED.md** - Power vs Energy concepts
2. **DASHBOARD_DATA_BEHAVIOR.md** - How dashboard data works
3. **ANALYTICS_COST_FIX.md** - Cost calculation fixes
4. **PERSISTENT_CONSUMPTION_IMPLEMENTATION.md** - Data persistence strategy
5. **POWER_SETTINGS.md** - Electricity pricing configuration

---

**Last Updated**: October 29, 2024
**Version**: 1.0
**Status**: Comprehensive Analysis Complete
