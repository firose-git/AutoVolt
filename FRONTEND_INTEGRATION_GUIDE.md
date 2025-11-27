# Frontend Integration Guide - Power Consumption System

## Overview

This guide explains how to integrate the frontend with the new power consumption backend APIs.

## ✅ What's Already Working

Your existing `EnergyMonitoringDashboard.tsx` component is well-structured and will work with minor API endpoint updates.

## 🔄 Required Changes

### 1. Update API Endpoints

The existing component uses old endpoints. Here's the mapping:

#### Old → New Endpoint Mapping

| Old Endpoint | New Endpoint | Purpose |
|-------------|--------------|---------|
| `/analytics/energy-summary` | `/power-analytics/current/:deviceId` + aggregations | Current power & summary |
| `/analytics/energy/24h` | `/power-analytics/today-hourly/:deviceId` | Today's hourly data |
| `/analytics/energy/30d` | `/power-analytics/daily/:deviceId?startDate=X&endDate=Y` | Monthly daily data |
| `/analytics/energy/90d` | `/power-analytics/monthly/:deviceId?year=YYYY` | Yearly monthly data |
| `/analytics/energy-calendar/:year/:month` | `/power-analytics/daily/:deviceId` (process into calendar) | Calendar view |
| `/analytics/dashboard` | `/devices` | Device list |
| `/settings/power/price` | `/power-settings/:deviceId` | Power settings |

### 2. New API Service Methods

Add these methods to your `src/services/api.ts`:

```typescript
// Power Analytics API
export const powerAnalyticsAPI = {
  // Get current power for a device
  getCurrentPower: (deviceId: string) =>
    api.get(`/power-analytics/current/${deviceId}`),

  // Get today's hourly consumption
  getTodayHourly: (deviceId: string) =>
    api.get(`/power-analytics/today-hourly/${deviceId}`),

  // Get daily consumption for date range
  getDailyConsumption: (deviceId: string, startDate: string, endDate: string, page?: number, limit?: number) => {
    const params = new URLSearchParams({ startDate, endDate });
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    return api.get(`/power-analytics/daily/${deviceId}?${params}`);
  },

  // Get monthly consumption for a year
  getMonthlyConsumption: (deviceId: string, year: number) =>
    api.get(`/power-analytics/monthly/${deviceId}?year=${year}`),

  // Get yearly consumption
  getYearlyConsumption: (deviceId: string, startYear: number, endYear: number) =>
    api.get(`/power-analytics/yearly/${deviceId}?startYear=${startYear}&endYear=${endYear}`),

  // Get all devices summary
  getAllDevicesConsumption: (startDate: string, endDate: string) =>
    api.get(`/power-analytics/all-devices?startDate=${startDate}&endDate=${endDate}`),

  // Get classroom consumption
  getClassroomConsumption: (classroom: string, startDate: string, endDate: string) =>
    api.get(`/power-analytics/classroom/${classroom}?startDate=${startDate}&endDate=${endDate}`),

  // Get cost comparison
  getCostComparison: (deviceId: string, period: 'day' | 'week' | 'month' = 'month') =>
    api.get(`/power-analytics/cost-comparison/${deviceId}?period=${period}`),

  // Get peak usage hours
  getPeakHours: (deviceId: string, days: number = 7) =>
    api.get(`/power-analytics/peak-hours/${deviceId}?days=${days}`),

  // Health check
  getHealth: () =>
    api.get('/power-analytics/health'),
};

// Power Settings API
export const powerSettingsAPI = {
  // Get settings for a device
  getSettings: (deviceId: string) =>
    api.get(`/power-settings/${deviceId}`),

  // Update price per unit
  updatePrice: (deviceId: string, pricePerUnit: number) =>
    api.put(`/power-settings/${deviceId}/price`, { pricePerUnit }),

  // Update consumption factor
  updateCalibration: (deviceId: string, consumptionFactor: number) =>
    api.put(`/power-settings/${deviceId}/calibration`, { consumptionFactor }),

  // Update both settings
  updateSettings: (deviceId: string, settings: { pricePerUnit?: number; consumptionFactor?: number }) =>
    api.put(`/power-settings/${deviceId}`, settings),

  // Bulk update price for multiple devices
  bulkUpdatePrice: (deviceIds: string[], pricePerUnit: number) =>
    api.put('/power-settings/bulk/price', { deviceIds, pricePerUnit }),

  // Get default settings
  getDefaults: () =>
    api.get('/power-settings/defaults'),
};
```

### 3. WebSocket Integration for Real-Time Updates

Add WebSocket listener for live power readings:

```typescript
import { io } from 'socket.io-client';

// In your component or service
const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001');

// Listen for power readings
socket.on('powerReading', (data) => {
  console.log('New power reading:', data);
  // Update your state with real-time data
  // data: { deviceId, deviceName, power, energy, cost, timestamp }
});

// Listen for offline sync completion
socket.on('readingsSynced', (data) => {
  console.log('Readings synced:', data);
  // Refresh charts after device reconnects
  // data: { deviceId, deviceName, count, duplicates }
});

// Cleanup
return () => {
  socket.off('powerReading');
  socket.off('readingsSynced');
};
```

### 4. Updated Data Types

```typescript
// Power Reading Types
export interface PowerReading {
  deviceId: string;
  deviceName: string;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  totalEnergy: number;
  status: 'online' | 'offline';
  activeSwitches: number;
  totalSwitches: number;
  pricePerUnit: number;
  cost: number;
  consumptionFactor: number;
}

// Current Power Status
export interface CurrentPower {
  power: number;
  voltage: number;
  current: number;
  lastUpdate: string | null;
  status: 'online' | 'offline' | 'no_data';
}

// Daily Consumption
export interface DailyConsumption {
  date: string;
  energyKwh: number;
  cost: number;
  avgPower: number;
  maxPower: number;
  minPower: number;
  readingCount: number;
  onlineReadings: number;
  offlineReadings: number;
}

// Monthly Consumption
export interface MonthlyConsumption {
  year: number;
  month: number;
  energyKwh: number;
  cost: number;
  avgPower: number;
  maxPower: number;
  readingCount: number;
  onlineReadings: number;
  offlineReadings: number;
}

// Power Settings
export interface PowerSettings {
  deviceId: string;
  deviceName: string;
  pricePerUnit: number;
  consumptionFactor: number;
  updatedAt: string | null;
}

// Health Status
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  healthScore: number;
  timestamp: string;
  database: {
    connected: boolean;
    totalReadings: number;
    recentReadings: number;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
    noData: number;
    list: DeviceStatus[];
  };
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
  };
}

export interface DeviceStatus {
  id: string;
  name: string;
  macAddress: string;
  status: 'online' | 'offline' | 'no_data';
  lastSeen: string | null;
  minutesSinceLastReading: number | null;
}
```

### 5. Updated Component Example

Here's how to update your `EnergyMonitoringDashboard.tsx`:

```typescript
import { powerAnalyticsAPI, powerSettingsAPI } from '@/services/api';

// Inside component:

// Fetch today's data
const fetchTodayData = async () => {
  if (!selectedDevice || selectedDevice === 'all') return;
  
  try {
    const [currentPower, todayHourly] = await Promise.all([
      powerAnalyticsAPI.getCurrentPower(selectedDevice),
      powerAnalyticsAPI.getTodayHourly(selectedDevice)
    ]);
    
    setCurrentPowerData(currentPower.data);
    setTodayData({
      consumption: todayHourly.data.reduce((sum, h) => sum + h.energyKwh, 0),
      cost: todayHourly.data.reduce((sum, h) => sum + h.cost, 0),
      onlineDevices: 1
    });
  } catch (error) {
    console.error('Error fetching today data:', error);
  }
};

// Fetch monthly data
const fetchMonthlyData = async () => {
  if (!selectedDevice || selectedDevice === 'all') return;
  
  try {
    const year = new Date().getFullYear();
    const response = await powerAnalyticsAPI.getMonthlyConsumption(selectedDevice, year);
    
    const currentMonth = new Date().getMonth();
    const thisMonthData = response.data.find(m => m.month === currentMonth + 1);
    
    if (thisMonthData) {
      setMonthData({
        consumption: thisMonthData.energyKwh,
        cost: thisMonthData.cost
      });
    }
  } catch (error) {
    console.error('Error fetching monthly data:', error);
  }
};

// Fetch chart data based on view mode
const fetchChartData = async () => {
  if (!selectedDevice || selectedDevice === 'all') return;
  
  try {
    let chartData = [];
    
    if (viewMode === 'day') {
      // Today's hourly data
      const response = await powerAnalyticsAPI.getTodayHourly(selectedDevice);
      chartData = response.data.map(item => ({
        timestamp: item.timestamp || new Date(0, 0, 0, item.hour).toISOString(),
        consumption: item.energyKwh,
        cost: item.cost,
        runtime: 0
      }));
    } else if (viewMode === 'month') {
      // Last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const response = await powerAnalyticsAPI.getDailyConsumption(
        selectedDevice,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      chartData = response.data.map(item => ({
        timestamp: item.date,
        consumption: item.energyKwh,
        cost: item.cost,
        runtime: 0
      }));
    } else {
      // This year's monthly data
      const year = new Date().getFullYear();
      const response = await powerAnalyticsAPI.getMonthlyConsumption(selectedDevice, year);
      
      chartData = response.data.map(item => ({
        timestamp: new Date(item.year, item.month - 1, 1).toISOString(),
        consumption: item.energyKwh,
        cost: item.cost,
        runtime: 0
      }));
    }
    
    setChartData(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    setChartData([]);
  }
};

// Fetch power settings
const fetchPowerSettings = async () => {
  if (!selectedDevice || selectedDevice === 'all') return;
  
  try {
    const response = await powerSettingsAPI.getSettings(selectedDevice);
    setElectricityPrice(response.data.pricePerUnit);
  } catch (error) {
    console.error('Error fetching power settings:', error);
  }
};
```

### 6. Handling Device Status

Show offline indicator when device is offline:

```tsx
{currentPowerData && (
  <div className="flex items-center gap-2">
    <div className={cn(
      "w-2 h-2 rounded-full",
      currentPowerData.status === 'online' ? "bg-green-500" : "bg-red-500"
    )} />
    <span className="text-sm text-muted-foreground">
      {currentPowerData.status === 'online' ? 'Online' : 'Offline'}
      {currentPowerData.lastUpdate && currentPowerData.status === 'offline' && (
        <span> - Last seen: {formatDistanceToNow(new Date(currentPowerData.lastUpdate))} ago</span>
      )}
    </span>
  </div>
)}
```

### 7. Pagination for Large Datasets

For viewing long date ranges, use pagination:

```typescript
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const itemsPerPage = 30;

const fetchPaginatedData = async () => {
  try {
    const response = await powerAnalyticsAPI.getDailyConsumption(
      selectedDevice,
      startDate,
      endDate,
      currentPage,
      itemsPerPage
    );
    
    // Handle paginated response
    if (response.data.pagination) {
      setChartData(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } else {
      // Backward compatible - no pagination
      setChartData(response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Pagination controls
<div className="flex justify-center gap-2 mt-4">
  <Button 
    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
    disabled={currentPage === 1}
  >
    Previous
  </Button>
  <span>Page {currentPage} of {totalPages}</span>
  <Button 
    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
    disabled={currentPage === totalPages}
  >
    Next
  </Button>
</div>
```

### 8. Error Handling

Always handle offline devices and missing data:

```typescript
try {
  const response = await powerAnalyticsAPI.getCurrentPower(deviceId);
  
  if (response.data.status === 'no_data') {
    // Show message: "No power data available for this device yet"
    showNoDataMessage();
  } else if (response.data.status === 'offline') {
    // Show last known values with offline indicator
    showOfflineData(response.data);
  } else {
    // Show live data
    showLiveData(response.data);
  }
} catch (error) {
  if (error.response?.status === 404) {
    // Device not found
    showError('Device not found');
  } else {
    // Other errors
    showError('Failed to load power data');
  }
}
```

## 🎨 UI Improvements

### 1. Show Offline Status

```tsx
<Badge variant={device.status === 'online' ? 'success' : 'destructive'}>
  {device.status === 'online' ? '● Online' : '○ Offline'}
</Badge>
```

### 2. Show Data Completeness

```tsx
{dailyData.onlineReadings && dailyData.offlineReadings && (
  <Tooltip>
    <TooltipTrigger>
      <Info className="h-3 w-3" />
    </TooltipTrigger>
    <TooltipContent>
      {dailyData.onlineReadings} online readings, {dailyData.offlineReadings} synced offline
    </TooltipContent>
  </Tooltip>
)}
```

### 3. Loading States

```tsx
{loading ? (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin" />
    <span className="ml-2">Loading power data...</span>
  </div>
) : (
  // Your chart component
)}
```

## 🧪 Testing Frontend

### 1. Test with Real Device Data

```bash
# Submit test reading
curl -X POST http://localhost:3001/api/esp32/power-reading/AA:BB:CC:DD:EE:FF \
  -H "Content-Type: application/json" \
  -d '{"voltage":230,"current":2.5,"power":575,"activeSwitches":2,"totalSwitches":2}'

# Then check frontend - should see update in dashboard
```

### 2. Test Offline Scenario

1. Stop backend temporarily
2. Frontend should show "Offline" status
3. Display last known values
4. Start backend again
5. Frontend should update to "Online" and show latest data

### 3. Test Pagination

1. Select a date range with > 30 days
2. Should see pagination controls
3. Navigate through pages
4. Verify data loads correctly

## 📝 Migration Checklist

- [ ] Add new API methods to `services/api.ts`
- [ ] Update `EnergyMonitoringDashboard.tsx` to use new endpoints
- [ ] Add TypeScript types for new data structures
- [ ] Implement WebSocket listeners for real-time updates
- [ ] Update PowerSettings component to use new API
- [ ] Add offline status indicators
- [ ] Test with real backend data
- [ ] Test pagination for large datasets
- [ ] Handle error cases (no data, offline, etc.)
- [ ] Update UI to show online/offline readings breakdown

## 🔗 Quick Links

- Backend API Documentation: `backend/POWER_CONSUMPTION_SYSTEM.md`
- Dashboard Behavior Guide: `backend/DASHBOARD_DATA_BEHAVIOR.md`
- Test Results: `backend/IMPLEMENTATION_COMPLETE.md`

## 💡 Best Practices

1. **Always check device status** before displaying data
2. **Cache last known values** for offline devices
3. **Show data age** ("Last updated 5 minutes ago")
4. **Use pagination** for date ranges > 30 days
5. **Handle WebSocket disconnections** gracefully
6. **Validate data before charting** (check for null/undefined)
7. **Show loading states** during API calls
8. **Provide feedback** on settings changes

## 🎯 Expected Results

After integration:
- ✅ Real-time power consumption updates
- ✅ Accurate historical data with online/offline breakdown
- ✅ Offline devices show last known values
- ✅ Charts update automatically when device reconnects
- ✅ Cumulative energy tracking across days/months
- ✅ Cost calculations with configurable price
- ✅ Pagination for large datasets
- ✅ Health monitoring of all devices

Your dashboard will now be fully integrated with the robust backend power consumption system!
