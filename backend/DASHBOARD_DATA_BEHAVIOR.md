# Dashboard Data Behavior Guide

## Energy Consumption Tracking

### 1. Cumulative Energy System ✅

**How it works:**
- Energy consumption is **CUMULATIVE** - new data is ADDED to existing data
- Each reading records incremental energy consumed since last reading
- Total energy is the sum of all readings

**Example:**
```
Time        | Reading (kWh) | Total Energy (kWh)
------------|---------------|-------------------
10:00 AM    | 0.5           | 0.5
11:00 AM    | 0.6           | 1.1
12:00 PM    | 0.4           | 1.5
1:00 PM     | 0.7           | 2.2
```

**Database:**
```javascript
// Each PowerReading document stores:
{
  energy: 0.5,           // Incremental energy for this interval (Wh)
  totalEnergy: 1.5,      // Cumulative total since device installed (kWh)
  timestamp: "2024-01-15T10:00:00Z"
}
```

### 2. Offline Device Handling ✅

**When Device Goes Offline:**

1. **Dashboard Shows Last Known Data**
   ```javascript
   // getCurrentPower() returns last reading
   {
     power: 520.5,        // Last known power
     voltage: 230.2,      // Last known voltage
     current: 2.3,        // Last known current
     lastUpdate: "2024-01-15T10:30:00Z",
     status: "offline"    // Device status
   }
   ```

2. **Charts Remain Visible**
   - All historical data stays visible
   - No gaps or missing data in charts
   - Last data point clearly marked

3. **Status Indicator**
   - Device marked as "offline" if no reading for 5+ minutes
   - Visual indicator should show: "Last seen: 2 hours ago"

**When Device Reconnects:**

1. ESP32 syncs buffered offline readings
2. Charts automatically update with missing data
3. Status changes back to "online"
4. No data loss - all offline readings are included

### 3. Active Logs Chart ✅

**Shows Real-Time Activity:**
```javascript
// Today's hourly consumption
GET /api/power-analytics/today-hourly/:deviceId

Response:
[
  { hour: 0, energyKwh: 0.5, cost: 3.75, avgPower: 500 },
  { hour: 1, energyKwh: 0.4, cost: 3.00, avgPower: 400 },
  { hour: 2, energyKwh: 0.3, cost: 2.25, avgPower: 300 },
  ...
]
```

**Behavior:**
- Updates every minute when device is online
- Shows cumulative energy per hour
- Includes both online and offline readings
- Real consumption data from database

### 4. Energy Section Charts ✅

#### Daily Chart
```javascript
GET /api/power-analytics/daily/:deviceId?startDate=2024-01-01&endDate=2024-01-31

Response:
[
  {
    date: "2024-01-15",
    energyKwh: 12.5,              // Total energy consumed this day
    cost: 93.75,                  // Total cost for this day
    avgPower: 520.83,             // Average power during day
    maxPower: 1200,               // Peak power
    readingCount: 1440,           // Number of readings
    onlineReadings: 1200,         // Readings while online
    offlineReadings: 240          // Readings synced after offline
  }
]
```

**Behavior:**
- Each day shows **total consumption** for that day
- Includes all readings (online + offline)
- Never overwrites previous days
- Charts accumulate data over time

#### Monthly Chart
```javascript
GET /api/power-analytics/monthly/:deviceId?year=2024

Response:
[
  {
    month: 1,
    year: 2024,
    energyKwh: 375.5,            // Total energy consumed in January
    cost: 2816.25,               // Total cost for January
    avgPower: 520.83,
    maxPower: 1500
  }
]
```

**Behavior:**
- Each month shows **total consumption** for that month
- Sum of all daily readings in that month
- Includes all online and offline periods

#### Yearly Chart
```javascript
GET /api/power-analytics/yearly/:deviceId?startYear=2023&endYear=2024

Response:
[
  {
    year: 2024,
    energyKwh: 4500.25,          // Total energy consumed in 2024
    cost: 33751.88,              // Total cost for 2024
    avgPower: 513.73
  }
]
```

**Behavior:**
- Each year shows **total consumption** for that year
- Sum of all monthly readings
- Complete historical view

### 5. Data Consistency

#### New Data Addition
```
✅ CORRECT BEHAVIOR (Current System):
Day 1: Device consumes 10 kWh → Chart shows 10 kWh for Day 1
Day 2: Device consumes 8 kWh  → Chart shows 10 kWh for Day 1, 8 kWh for Day 2
Day 3: Device consumes 12 kWh → Chart shows 10 kWh for Day 1, 8 kWh for Day 2, 12 kWh for Day 3

❌ WRONG BEHAVIOR (What system does NOT do):
Day 1: 10 kWh → Chart shows 10 kWh
Day 2: 8 kWh  → Chart shows 8 kWh (Day 1 data disappears) ❌ NO!
```

#### Offline Period
```
Timeline:
10:00 AM - Device online  → 0.5 kWh consumed
11:00 AM - Device online  → 0.6 kWh consumed
12:00 PM - Device OFFLINE → 0.4 kWh (buffered locally)
1:00 PM  - Device OFFLINE → 0.7 kWh (buffered locally)
2:00 PM  - Device ONLINE  → Syncs offline readings

Dashboard shows:
✅ During offline: Shows data up to 11:00 AM, status = "offline"
✅ After reconnect: Shows complete data 10:00 AM - 2:00 PM, status = "online"
✅ Charts update with offline readings
✅ No data loss
```

### 6. Dashboard Implementation Requirements

#### Real-Time Updates
```javascript
// Listen for WebSocket events
socket.on('powerReading', (data) => {
  // Update current power display
  updateCurrentPower(data);
  
  // Add to today's chart
  addToHourlyChart(data);
});

socket.on('readingsSynced', (data) => {
  // Device reconnected with offline data
  console.log(`${data.count} readings synced from offline buffer`);
  
  // Refresh all charts to show complete data
  refreshDailyChart();
  refreshMonthlyChart();
});
```

#### Offline Status Display
```javascript
// Check device status
if (deviceStatus === 'offline') {
  showIndicator('Device offline - showing last known data');
  displayLastSeenTime(lastUpdate);
  // Keep showing last values
  // Keep showing all historical charts
}
```

#### Chart Data Fetching
```javascript
// Daily consumption chart
const dailyData = await fetch(
  `/api/power-analytics/daily/${deviceId}?startDate=2024-01-01&endDate=2024-01-31`
);

// Shows cumulative daily totals
// Includes all online and offline periods
// Never loses historical data
```

### 7. Expected Dashboard Behavior Summary

| Scenario | Dashboard Behavior |
|----------|-------------------|
| Device online, sending data | ✅ Live power updates every minute<br>✅ Charts update in real-time<br>✅ Status: "Online" |
| Device goes offline | ✅ Shows last known power reading<br>✅ All historical charts remain visible<br>✅ Status: "Offline - Last seen X minutes ago" |
| New day starts | ✅ Yesterday's data remains in daily chart<br>✅ Today shows new cumulative total<br>✅ No data overwriting |
| Device reconnects after offline | ✅ Status changes to "Online"<br>✅ Charts automatically refresh<br>✅ Offline readings appear in charts<br>✅ No gaps in data |
| Month ends | ✅ Current month data finalized<br>✅ New month starts fresh cumulative count<br>✅ Monthly chart shows historical months |

### 8. Frontend Chart Implementation

#### Daily Energy Chart (Example)
```javascript
// Fetch data
const response = await fetch(
  `/api/power-analytics/daily/${deviceId}?startDate=${startDate}&endDate=${endDate}`
);
const dailyData = await response.json();

// Chart data
const chartData = {
  labels: dailyData.map(d => d.date),
  datasets: [{
    label: 'Energy Consumption (kWh)',
    data: dailyData.map(d => d.energyKwh),
    backgroundColor: 'rgba(75, 192, 192, 0.5)'
  }]
};

// Important: Each bar shows THAT DAY's consumption
// NOT cumulative across days
```

#### Current Power Display
```javascript
// Update every 5 seconds
setInterval(async () => {
  const response = await fetch(`/api/power-analytics/current/${deviceId}`);
  const data = await response.json();
  
  // Update display
  document.getElementById('current-power').textContent = data.power + ' W';
  document.getElementById('voltage').textContent = data.voltage + ' V';
  document.getElementById('current').textContent = data.current + ' A';
  
  // Update status indicator
  if (data.status === 'offline') {
    showOfflineIndicator(data.lastUpdate);
  } else {
    showOnlineIndicator();
  }
}, 5000);
```

## Key Takeaways

✅ **Energy is CUMULATIVE** - new readings add to existing data  
✅ **Historical data NEVER disappears** - all past readings remain  
✅ **Offline devices show LAST KNOWN data** - no blank screens  
✅ **Charts show REAL consumption** - from actual database readings  
✅ **Daily/Monthly/Yearly charts show TOTALS** - not cumulative sums  
✅ **Online and offline readings are BOTH included** - no data loss  

## Testing Checklist

- [ ] Device online: Charts update in real-time
- [ ] Device offline: Last data remains visible
- [ ] Device reconnect: Offline data appears in charts
- [ ] New day: Yesterday's data stays in chart, today starts fresh
- [ ] Multiple devices: Each shows independent consumption
- [ ] Historical view: All past data accessible
- [ ] Status indicator: Shows online/offline correctly
- [ ] Last seen time: Updates when device goes offline
