# Persistent Consumption Data Implementation Guide

## Overview
This guide implements a comprehensive solution to ensure accurate power consumption data display regardless of device offline status.

## What Has Been Created

### 1. New Database Models

#### `models/DailyConsumption.js`
- Stores aggregated daily consumption data per device
- Fields: energyConsumptionKwh, costINR, runtimeHours, avgPowerWatts, etc.
- Indexed for fast queries by date, device, and classroom
- Methods: `getConsumptionByDateRange()`, `getClassroomConsumption()`, `upsertDailyConsumption()`

#### `models/MonthlyConsumption.js`
- Stores aggregated monthly consumption data per device
- Includes daily breakdown within the month
- Methods: `upsertMonthlyConsumption()`

### 2. Aggregation Service

#### `services/consumptionAggregationService.js`
- Runs every 15 minutes to aggregate consumption data
- Aggregates today's data continuously
- Finalizes yesterday's data at 2 AM
- Methods:
  - `start()` - Start the service
  - `stop()` - Stop the service
  - `aggregateDailyData(date)` - Aggregate specific date
  - `aggregateMonthlyData(year, month)` - Aggregate specific month
  - `backfillHistoricalData(startDate, endDate)` - Backfill past data

## Implementation Steps

### Step 1: Apply Dashboard Fix (metricsService.js)

**Location**: `backend/metricsService.js` around line 1596

**Replace:**
```javascript
// Calculate energy costs in INR based on actual usage
// For dashboard, we calculate based on current power consumption over time periods
const dailyEnergyCost = calculateEnergyCostINR(totalPowerConsumption, 24); // 24 hours
const monthlyEnergyCost = calculateEnergyCostINR(totalPowerConsumption, 720); // 30 days ≈ 720 hours
```

**With:**
```javascript
// Calculate actual energy costs using aggregated data from DailyConsumption
const DailyConsumption = require('./models/DailyConsumption');
const MonthlyConsumption = require('./models/MonthlyConsumption');

const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

// Get aggregated daily consumption (includes offline devices' historical data)
const todayConsumption = await DailyConsumption.aggregate([
  { $match: { date: todayStart } },
  { $group: {
      _id: null,
      totalEnergy: { $sum: '$energyConsumptionKwh' },
      totalCost: { $sum: '$costINR' }
    }
  }
]);

// Get aggregated monthly consumption
const monthlyConsumption = await MonthlyConsumption.aggregate([
  { $match: { year: now.getFullYear(), month: now.getMonth() + 1 } },
  { $group: {
      _id: null,
      totalEnergy: { $sum: '$energyConsumptionKwh' },
      totalCost: { $sum: '$costINR' }
    }
  }
]);

const dailyEnergyCost = todayConsumption.length > 0 ? todayConsumption[0].totalCost : 0;
const monthlyEnergyCost = monthlyConsumption.length > 0 ? monthlyConsumption[0].totalCost : 0;
const dailyEnergyKwh = todayConsumption.length > 0 ? todayConsumption[0].totalEnergy : 0;
const monthlyEnergyKwh = monthlyConsumption.length > 0 ? monthlyConsumption[0].totalEnergy : 0;
```

**Update the energyCosts object (line 1616):**
```javascript
energyCosts: {
  dailyINR: parseFloat(dailyEnergyCost.toFixed(2)),
  monthlyINR: parseFloat(monthlyEnergyCost.toFixed(2)),
  dailyConsumption: parseFloat(dailyEnergyKwh.toFixed(3)),
  monthlyConsumption: parseFloat(monthlyEnergyKwh.toFixed(3)),
  electricityRate: ELECTRICITY_RATE_INR_PER_KWH,
  currency: 'INR'
}
```

### Step 2: Add clearDashboardCache Function

**Location**: `backend/metricsService.js` before `module.exports` (around line 2702)

**Add:**
```javascript
/**
 * Clear dashboard cache
 * Called when settings are updated to force recalculation
 */
function clearDashboardCache() {
  dashboardCache.data = null;
  dashboardCache.timestamp = 0;
  console.log('[Metrics] Dashboard cache cleared');
}
```

**Update module.exports:**
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

### Step 3: Update Settings Route to Clear Cache

**Location**: `backend/routes/settings.js` after line 123

**Add after `await reloadMetricsSettings();`:**
```javascript
// Clear dashboard cache to force recalculation with new prices
const metricsService = require('../metricsService');
metricsService.clearDashboardCache();
console.log('[Settings] Dashboard cache cleared after settings update');
```

### Step 4: Initialize Aggregation Service

**Location**: `backend/server.js` after line 1667 (after afterHoursLightsMonitor.start())

**Add:**
```javascript
// Initialize Consumption Aggregation Service
const consumptionAggregationService = require('./services/consumptionAggregationService');
consumptionAggregationService.start();
```

### Step 5: Update getEnergySummary to Use Aggregated Data

**Location**: `backend/metricsService.js` `getEnergySummary()` function (line 2461)

**Replace the entire function with:**
```javascript
async function getEnergySummary() {
  try {
    const DailyConsumption = require('./models/DailyConsumption');
    const MonthlyConsumption = require('./models/MonthlyConsumption');
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    
    // Get today's aggregated data
    const todayData = await DailyConsumption.aggregate([
      { $match: { date: todayStart } },
      { $group: {
          _id: null,
          consumption: { $sum: '$energyConsumptionKwh' },
          cost: { $sum: '$costINR' },
          runtime: { $sum: '$runtimeHours' },
          deviceCount: { $sum: 1 }
        }
      }
    ]);

    // Get this month's aggregated data
    const monthData = await MonthlyConsumption.aggregate([
      { $match: { year: now.getFullYear(), month: now.getMonth() + 1 } },
      { $group: {
          _id: null,
          consumption: { $sum: '$energyConsumptionKwh' },
          cost: { $sum: '$costINR' },
          runtime: { $sum: '$runtimeHours' },
          deviceCount: { $sum: 1 }
        }
      }
    ]);

    const dailyResult = todayData.length > 0 ? todayData[0] : { consumption: 0, cost: 0, runtime: 0, deviceCount: 0 };
    const monthlyResult = monthData.length > 0 ? monthData[0] : { consumption: 0, cost: 0, runtime: 0, deviceCount: 0 };

    const summary = {
      daily: {
        consumption: parseFloat(dailyResult.consumption.toFixed(3)),
        cost: parseFloat(dailyResult.cost.toFixed(2)),
        runtime: parseFloat(dailyResult.runtime.toFixed(2)),
        onlineDevices: dailyResult.deviceCount
      },
      monthly: {
        consumption: parseFloat(monthlyResult.consumption.toFixed(3)),
        cost: parseFloat(monthlyResult.cost.toFixed(2)),
        runtime: parseFloat(monthlyResult.runtime.toFixed(2)),
        onlineDevices: monthlyResult.deviceCount
      },
      timestamp: now.toISOString()
    };

    console.log('[Energy Summary] From aggregated data:', {
      daily: `${summary.daily.consumption} kWh (₹${summary.daily.cost})`,
      monthly: `${summary.monthly.consumption} kWh (₹${summary.monthly.cost})`
    });

    return summary;
  } catch (error) {
    console.error('Error getting energy summary:', error);
    return {
      daily: { consumption: 0, cost: 0, runtime: 0, onlineDevices: 0 },
      monthly: { consumption: 0, cost: 0, runtime: 0, onlineDevices: 0 },
      timestamp: new Date().toISOString()
    };
  }
}
```

### Step 6: Update getEnergyCalendar to Use Aggregated Data

**Location**: `backend/metricsService.js` `getEnergyCalendar()` function (line 2599)

**Replace the calculation logic with:**
```javascript
async function getEnergyCalendar(year, month) {
  try {
    const DailyConsumption = require('./models/DailyConsumption');
    
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    
    // Get all daily consumption records for this month
    const dailyRecords = await DailyConsumption.find({
      date: { $gte: monthStart, $lte: monthEnd }
    }).lean();

    // Group by date
    const dayMap = {};
    dailyRecords.forEach(record => {
      const day = record.date.getDate();
      if (!dayMap[day]) {
        dayMap[day] = {
          energyKwh: 0,
          costINR: 0,
          runtimeHours: 0
        };
      }
      dayMap[day].energyKwh += record.energyConsumptionKwh;
      dayMap[day].costINR += record.costINR;
      dayMap[day].runtimeHours += record.runtimeHours;
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    let totalCost = 0;
    let totalConsumption = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = dayMap[day] || { energyKwh: 0, costINR: 0, runtimeHours: 0 };
      
      totalCost += dayData.costINR;
      totalConsumption += dayData.energyKwh;

      // Categorize based on consumption thresholds
      let category = 'low';
      if (dayData.energyKwh > 2) {
        category = 'high';
      } else if (dayData.energyKwh > 1) {
        category = 'medium';
      }

      days.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        consumption: parseFloat(dayData.energyKwh.toFixed(3)),
        cost: parseFloat(dayData.costINR.toFixed(2)),
        runtime: parseFloat(dayData.runtimeHours.toFixed(2)),
        category
      });
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      month: monthNames[month - 1],
      year,
      days,
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalConsumption: parseFloat(totalConsumption.toFixed(3))
    };
  } catch (error) {
    console.error('Error getting energy calendar:', error);
    return {
      month: '',
      year,
      days: [],
      totalCost: 0,
      totalConsumption: 0
    };
  }
}
```

### Step 7: Add API Endpoints for Consumption Management

**Location**: Create new file `backend/routes/consumption.js`

```javascript
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const DailyConsumption = require('../models/DailyConsumption');
const MonthlyConsumption = require('../models/MonthlyConsumption');
const consumptionAggregationService = require('../services/consumptionAggregationService');

// Get aggregation service status
router.get('/status', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const status = consumptionAggregationService.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

// Manually trigger aggregation for today
router.post('/aggregate/today', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    await consumptionAggregationService.aggregateForDate(new Date());
    res.json({ success: true, message: 'Aggregation completed for today' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate data' });
  }
});

// Backfill historical data
router.post('/backfill', auth, authorize('admin', 'super-admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }

    // Run backfill asynchronously
    consumptionAggregationService.backfillHistoricalData(
      new Date(startDate),
      new Date(endDate)
    ).then(() => {
      console.log('Backfill completed');
    }).catch(err => {
      console.error('Backfill error:', err);
    });

    res.json({ success: true, message: 'Backfill started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start backfill' });
  }
});

// Get daily consumption for date range
router.get('/daily', auth, async (req, res) => {
  try {
    const { startDate, endDate, deviceId, classroom } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (deviceId) query.deviceId = deviceId;
    if (classroom) query.classroom = classroom;

    const data = await DailyConsumption.find(query).sort({ date: 1 }).lean();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get daily consumption' });
  }
});

// Get monthly consumption
router.get('/monthly', auth, async (req, res) => {
  try {
    const { year, month, deviceId, classroom } = req.query;
    
    const query = {};
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);
    if (deviceId) query.deviceId = deviceId;
    if (classroom) query.classroom = classroom;

    const data = await MonthlyConsumption.find(query).sort({ year: -1, month: -1 }).lean();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monthly consumption' });
  }
});

module.exports = router;
```

**Add to server.js:**
```javascript
app.use('/api/consumption', require('./routes/consumption'));
```

### Step 8: Frontend Settings UI

Ensure your frontend has a settings page with these fields:

```tsx
// Example React component
const PowerSettings = () => {
  const [settings, setSettings] = useState({
    electricityPrice: 7.5,
    deviceTypes: []
  });

  const handleSave = async () => {
    const response = await fetch('/api/settings/power', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (response.ok) {
      // Reload dashboard
      await fetch('/api/settings/power/reload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      alert('Settings updated successfully!');
    }
  };

  return (
    <div>
      <h2>Power Settings</h2>
      
      <label>Electricity Price (₹/kWh)</label>
      <input
        type="number"
        step="0.1"
        value={settings.electricityPrice}
        onChange={(e) => setSettings({
          ...settings,
          electricityPrice: parseFloat(e.target.value)
        })}
      />

      <h3>Device Power Consumption</h3>
      {settings.deviceTypes.map((device, index) => (
        <div key={index}>
          <label>{device.name}</label>
          <input
            type="number"
            value={device.powerConsumption}
            onChange={(e) => {
              const newTypes = [...settings.deviceTypes];
              newTypes[index].powerConsumption = parseInt(e.target.value);
              setSettings({ ...settings, deviceTypes: newTypes });
            }}
          />
          <span>Watts</span>
        </div>
      ))}

      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
};
```

## Testing the Implementation

### 1. Start the Services
```bash
# Restart the backend server
npm run dev
```

### 2. Backfill Historical Data
```bash
curl -X POST http://localhost:3001/api/consumption/backfill \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

### 3. Check Aggregation Status
```bash
curl -X GET http://localhost:3001/api/consumption/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Verify Data
```bash
# Get today's consumption
curl -X GET "http://localhost:3001/api/consumption/daily?startDate=2024-12-20&endDate=2024-12-20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get monthly consumption
curl -X GET "http://localhost:3001/api/consumption/monthly?year=2024&month=12" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Test Offline Device Scenario
1. Turn on a device and let it run for an hour
2. Turn off the device
3. Take the device offline (disconnect ESP32)
4. Check dashboard - consumption data should still show
5. Check charts - historical data should be visible

## Benefits of This Implementation

✅ **Persistent Data**: All consumption data stored in database  
✅ **Offline Resilience**: Historical data remains even when devices go offline  
✅ **Fast Queries**: Aggregated data provides instant results  
✅ **Accurate Costs**: Uses current electricity rates for calculations  
✅ **Consistent Display**: Dashboard, charts, and analytics all match  
✅ **Editable Settings**: Admin can update rates and consumption values  
✅ **Automatic Updates**: Service runs every 15 minutes  
✅ **Historical Backfill**: Can retroactively calculate past consumption  

## Maintenance

### Daily Tasks
- None (automatic)

### Weekly Tasks
- Check aggregation service status
- Monitor database size

### Monthly Tasks
- Review and optimize indexes
- Archive old data if needed

## Troubleshooting

### Data not showing in dashboard
1. Check if aggregation service is running: `GET /api/consumption/status`
2. Check if data exists: `GET /api/consumption/daily`
3. Clear cache: `POST /api/settings/power/reload`

### Costs not updating after price change
1. Update settings: `POST /api/settings/power`
2. Trigger re-aggregation: `POST /api/consumption/aggregate/today`
3. Wait 15 minutes for next automatic update

### Historical data missing
1. Run backfill: `POST /api/consumption/backfill`
2. Check ActivityLog has data for that period
3. Verify devices exist in database
