# Analytics & Monitoring Cost/Consumption Mismatch - Analysis & Fix

## Issues Identified

### 1. **Cost and Consumption Not Matching Charts**

#### Root Causes:

**A. Multiple Calculation Methods**
The system has several different calculation methods that can produce inconsistent results:

1. **Real-time Dashboard** (`getDashboardData()` - line 1463-1667)
   - Calculates based on **current power consumption** × time
   - Uses: `calculateEnergyCostINR(totalPowerConsumption, 24)` for daily
   - Uses: `calculateEnergyCostINR(totalPowerConsumption, 720)` for monthly
   - **Problem**: Assumes constant power usage, doesn't account for actual switch on/off history

2. **Energy Summary** (`getEnergySummary()` - line 2461-2593)
   - Uses **ActivityLog** to calculate precise consumption
   - Calls: `calculatePreciseEnergyConsumption()` for each device
   - **Correct approach** - accounts for actual usage patterns

3. **Energy History/Charts** (`getEnergyData()` - line 1773-1862)
   - Also uses `calculatePreciseEnergyConsumption()` per hour
   - **Correct approach** - matches actual activity logs

**B. Timing Issues**
- Dashboard caches data for 10 seconds (line 563)
- If settings change (electricity price), dashboard may show old data
- Power settings reload every 30 seconds (line 557)
- There's a race condition between settings update and dashboard refresh

**C. Offline Device Handling**
- Line 1259: `if (device.status !== 'online') return 0;`
- Dashboard only counts **currently online** devices
- But historical charts count all devices that were ever on
- This causes mismatch when devices go offline

### 2. **Settings UI Not Working Properly**

The settings endpoints ARE working (routes/settings.js lines 78-136), but:

**A. Frontend may not be calling the right endpoints:**
- Endpoint: `POST /api/settings/power`
- Requires admin role
- Updates both device power consumption and electricity price

**B. Settings reload mechanism:**
- Backend reloads settings automatically every 30 seconds
- Manual reload available at `POST /api/settings/power/reload`
- But dashboard cache (10s TTL) may show stale data

## Solutions

### Fix 1: Synchronize Dashboard with Energy Summary

The dashboard should use the same calculation method as the energy summary and charts.

**File**: `backend/metricsService.js`

**Current Code (lines 1596-1599):**
```javascript
// Calculate energy costs in INR based on actual usage
// For dashboard, we calculate based on current power consumption over time periods
const dailyEnergyCost = calculateEnergyCostINR(totalPowerConsumption, 24); // 24 hours
const monthlyEnergyCost = calculateEnergyCostINR(totalPowerConsumption, 720); // 30 days ≈ 720 hours
```

**Problem**: Uses current power × full time period, not actual usage

**Solution**: Use the same precise calculation as getEnergySummary()

```javascript
// Calculate actual energy costs based on real usage from ActivityLog
const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

let dailyConsumptionTotal = 0;
let monthlyConsumptionTotal = 0;

// Calculate precise consumption for each device
for (const device of dbDevices) {
  const dailyPrecise = await calculatePreciseEnergyConsumption(
    device._id,
    todayStart,
    now
  );
  const monthlyPrecise = await calculatePreciseEnergyConsumption(
    device._id,
    monthStart,
    now
  );
  dailyConsumptionTotal += dailyPrecise;
  monthlyConsumptionTotal += monthlyPrecise;
}

const dailyEnergyCost = dailyConsumptionTotal * ELECTRICITY_RATE_INR_PER_KWH;
const monthlyEnergyCost = monthlyConsumptionTotal * ELECTRICITY_RATE_INR_PER_KWH;
```

### Fix 2: Clear Dashboard Cache on Settings Update

**File**: `backend/routes/settings.js`

**Add to line 123 (after reloadMetricsSettings()):**
```javascript
// Clear dashboard cache to force recalculation with new prices
const metricsService = require('../metricsService');
metricsService.clearDashboardCache();
```

**File**: `backend/metricsService.js`

**Add function:**
```javascript
// Clear dashboard cache (add before module.exports)
function clearDashboardCache() {
  dashboardCache.data = null;
  dashboardCache.timestamp = 0;
  console.log('[Metrics] Dashboard cache cleared');
}
```

**Update module.exports (line 2702):**
```javascript
module.exports = {
  getContentType,
  getMetrics,
  getDashboardData,
  getEnergySummary,
  getEnergyCalendar,
  getDeviceUsageData,
  getDeviceHealth,
  getOccupancyData,
  getAnomalyHistory,
  getForecastData,
  getPredictiveMaintenance,
  getRealtimeMetrics,
  getComparativeAnalytics,
  getEfficiencyMetrics,
  getBasePowerConsumption,
  calculateDevicePowerConsumption,
  calculateEnergyConsumption,
  calculatePreciseEnergyConsumption,
  initializeMetrics,
  initializeMetricsAfterDB,
  loadPowerSettings,
  clearDashboardCache, // NEW
  updateDeviceMetrics: () => {},
  // Matrix functions...
  PowerMatrix,
  calculateClassroomPowerMatrix,
  createClassroomDeviceMatrix,
  createDevicePowerVector,
  createTimeSeriesPowerMatrix,
  createDeviceTypePowerMatrix,
  calculateClassroomEfficiencyMatrix,
  getClassroomPowerMatrixAnalytics
};
```

### Fix 3: Performance Optimization (Optional but Recommended)

The current fix would be slow because it calls `calculatePreciseEnergyConsumption()` for every device. We can optimize:

**Option A: Cache Energy Calculations**
```javascript
const energyCalculationCache = new Map();
const ENERGY_CACHE_TTL = 60000; // 1 minute

async function getCachedEnergyConsumption(deviceId, startTime, endTime) {
  const cacheKey = `${deviceId}_${startTime.getTime()}_${endTime.getTime()}`;
  const cached = energyCalculationCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < ENERGY_CACHE_TTL) {
    return cached.value;
  }
  
  const value = await calculatePreciseEnergyConsumption(deviceId, startTime, endTime);
  energyCalculationCache.set(cacheKey, { value, timestamp: Date.now() });
  
  // Clean old cache entries
  if (energyCalculationCache.size > 1000) {
    const cutoff = Date.now() - ENERGY_CACHE_TTL;
    for (const [key, data] of energyCalculationCache.entries()) {
      if (data.timestamp < cutoff) {
        energyCalculationCache.delete(key);
      }
    }
  }
  
  return value;
}
```

**Option B: Pre-calculate and Store**
Call `getEnergySummary()` once and reuse the results:

```javascript
async function getDashboardData() {
  try {
    const now = Date.now();
    if (dashboardCache.data && (now - dashboardCache.timestamp) < dashboardCache.ttl) {
      return dashboardCache.data;
    }

    // Get energy summary first (includes precise calculations)
    const energySummary = await getEnergySummary();
    
    // ... rest of dashboard data collection ...
    
    const result = {
      devices,
      classrooms,
      summary: {
        totalDevices,
        onlineDevices,
        activeDevices,
        totalPowerConsumption,
        averageHealthScore,
        totalClassrooms: classrooms.length,
        occupiedClassrooms: classrooms.filter(c => c.occupancy > 0).length,
        energyCosts: {
          dailyINR: energySummary.daily.cost, // Use from summary
          monthlyINR: energySummary.monthly.cost, // Use from summary
          dailyConsumption: energySummary.daily.consumption,
          monthlyConsumption: energySummary.monthly.consumption,
          electricityRate: ELECTRICITY_RATE_INR_PER_KWH,
          currency: 'INR'
        }
      },
      powerBreakdown: {
        byClassroom: classrooms.map(c => ({
          classroom: c.name,
          power: c.totalPower,
          devices: c.deviceCount,
          percentage: totalPowerConsumption > 0 ? (c.totalPower / totalPowerConsumption * 100).toFixed(1) : 0,
          dailyCostINR: parseFloat(calculateEnergyCostINR(c.totalPower, 24).toFixed(2))
        })),
        byDeviceType: calculatePowerByDeviceType(devices)
      }
    };
    
    dashboardCache.data = result;
    dashboardCache.timestamp = now;
    
    return result;
  } catch (error) {
    // ...
  }
}
```

### Fix 4: Verify Settings Endpoints Are Accessible

**Test Commands:**

1. **Get Current Settings:**
```bash
curl -X GET http://localhost:3001/api/settings/power \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Update Settings:**
```bash
curl -X POST http://localhost:3001/api/settings/power \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "electricityPrice": 8.5,
    "deviceTypes": [
      { "type": "relay", "name": "Relay Switch", "icon": "Zap", "powerConsumption": 50, "unit": "W" },
      { "type": "light", "name": "LED Lights", "icon": "Lightbulb", "powerConsumption": 40, "unit": "W" },
      { "type": "fan", "name": "HVAC Fans", "icon": "Fan", "powerConsumption": 75, "unit": "W" },
      { "type": "outlet", "name": "Power Outlet", "icon": "Plug", "powerConsumption": 100, "unit": "W" },
      { "type": "projector", "name": "Projector", "icon": "Monitor", "powerConsumption": 200, "unit": "W" },
      { "type": "ac", "name": "Air Conditioner", "icon": "Activity", "powerConsumption": 1500, "unit": "W" }
    ]
  }'
```

3. **Force Settings Reload:**
```bash
curl -X POST http://localhost:3001/api/settings/power/reload \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Get Electricity Price Only:**
```bash
curl -X GET http://localhost:3001/api/settings/power/price \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Fix 5: Frontend Integration

If the frontend is not properly displaying the settings UI, check:

**A. Settings Form Component:**
Should have fields for:
- Electricity Price (₹/kWh)
- Device Type Power Consumption (Watts)

**B. API Calls:**
```typescript
// Get settings
const response = await fetch('/api/settings/power', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const settings = await response.json();

// Update settings
await fetch('/api/settings/power', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    electricityPrice: 8.5,
    deviceTypes: [...]
  })
});
```

**C. Real-time Updates:**
After updating settings, the frontend should:
1. Call the reload endpoint
2. Refresh the dashboard data
3. Show a success message

## Implementation Steps

### Step 1: Apply Quick Fix (Recommended)
Use Option B from Fix 3 - reuse energy summary in dashboard

### Step 2: Add Cache Clearing
Implement Fix 2 to clear cache when settings change

### Step 3: Test Thoroughly
1. Update electricity price
2. Verify dashboard shows new cost immediately
3. Compare dashboard cost with chart data
4. Check energy summary endpoint

### Step 4: Monitor Performance
- Dashboard load time
- Energy calculation time
- Cache hit rate

## Expected Behavior After Fix

1. **Dashboard Cost** = **Energy Summary Cost** = **Chart Data**
2. Cost updates immediately when electricity price changes
3. Consumption data matches across all views
4. Historical data reflects actual switch on/off times
5. Settings update works correctly

## Verification Checklist

- [ ] Dashboard daily cost matches `/api/analytics/energy-summary` daily cost
- [ ] Dashboard monthly cost matches `/api/analytics/energy-summary` monthly cost
- [ ] Chart consumption data matches summary
- [ ] Cost changes when electricity price is updated
- [ ] Settings UI saves successfully
- [ ] Settings reload works (manual and automatic)
- [ ] Performance is acceptable (< 2s for dashboard load)

## Additional Recommendations

1. **Add validation** in frontend for electricity price (must be > 0)
2. **Add confirmation dialog** before updating settings
3. **Show loading state** while calculating precise energy
4. **Add tooltips** explaining calculation methods
5. **Log** settings changes for audit trail
6. **Display** last settings update timestamp

## Files Modified

1. `backend/metricsService.js` - getDashboardData() function
2. `backend/routes/settings.js` - add cache clearing
3. Frontend Settings component (if needed)

## Testing Script

```javascript
// backend/test-analytics-consistency.js
const mongoose = require('mongoose');
const metricsService = require('./metricsService');

async function testAnalyticsConsistency() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Testing Analytics Consistency...\n');
    
    // Get dashboard data
    const dashboard = await metricsService.getDashboardData();
    console.log('Dashboard Daily Cost:', dashboard.summary.energyCosts.dailyINR);
    console.log('Dashboard Monthly Cost:', dashboard.summary.energyCosts.monthlyINR);
    
    // Get energy summary
    const summary = await metricsService.getEnergySummary();
    console.log('\nEnergy Summary Daily Cost:', summary.daily.cost);
    console.log('Energy Summary Monthly Cost:', summary.monthly.cost);
    
    // Calculate difference
    const dailyDiff = Math.abs(dashboard.summary.energyCosts.dailyINR - summary.daily.cost);
    const monthlyDiff = Math.abs(dashboard.summary.energyCosts.monthlyINR - summary.monthly.cost);
    
    console.log('\nDifferences:');
    console.log('Daily:', dailyDiff.toFixed(2), 'INR');
    console.log('Monthly:', monthlyDiff.toFixed(2), 'INR');
    
    if (dailyDiff < 0.01 && monthlyDiff < 0.01) {
      console.log('\n✅ PASS: Costs are consistent!');
    } else {
      console.log('\n❌ FAIL: Costs do not match!');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnalyticsConsistency();
```

Run with:
```bash
node backend/test-analytics-consistency.js
```
