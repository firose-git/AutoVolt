# Power Consumption System Documentation

## Overview

This system accurately tracks power consumption from ESP32 devices with support for offline data buffering and synchronization. No data is lost when devices disconnect, and all historical data remains available on the dashboard.

## Architecture

### Database Schema

**PowerReading Collection**
- Stores individual power readings with voltage, current, power, energy
- Supports both online and offline readings
- Calculates cumulative energy consumption
- Includes timestamp-based unique identifiers to prevent duplicates
- Tracks cost based on configurable price per kWh

### Key Components

1. **PowerReading Model** (`models/PowerReading.js`)
   - Individual reading storage with full electrical measurements
   - Pre-save hooks for automatic calculations
   - Duplicate prevention via unique readingId

2. **ESP32 Controller** (`controllers/esp32Controller.js`)
   - `submitPowerReading()` - Live data submission endpoint
   - `syncOfflineReadings()` - Bulk sync for buffered readings

3. **Power Analytics Service** (`services/powerAnalyticsService.js`)
   - Daily, monthly, yearly aggregations
   - Classroom and device-level analytics
   - Cost comparisons and peak usage analysis

4. **API Routes**
   - `/api/esp32/power-reading/:macAddress` - Live readings
   - `/api/esp32/sync-readings/:macAddress` - Offline sync
   - `/api/power-analytics/*` - Dashboard analytics
   - `/api/power-settings/:deviceId` - Configuration

## ESP32 Integration

### Live Data Submission

**Endpoint:** `POST /api/esp32/power-reading/:macAddress`

**Request Body:**
```json
{
  "voltage": 230.5,
  "current": 2.3,
  "power": 529.15,
  "activeSwitches": 3,
  "totalSwitches": 4,
  "metadata": {
    "temperature": 28.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "readingId": "507f1f77bcf86cd799439011_1698765432000",
  "totalEnergy": 12.543
}
```

### Offline Data Sync

**Endpoint:** `POST /api/esp32/sync-readings/:macAddress`

**Request Body:**
```json
{
  "readings": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "voltage": 230.2,
      "current": 2.1,
      "power": 483.42,
      "activeSwitches": 2,
      "totalSwitches": 4
    },
    {
      "timestamp": "2024-01-15T10:01:00Z",
      "voltage": 230.8,
      "current": 2.4,
      "power": 553.92,
      "activeSwitches": 3,
      "totalSwitches": 4
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "inserted": 120,
  "duplicates": 5,
  "totalEnergy": 15.234
}
```

### ESP32 Firmware Requirements

#### 1. Power Calculation
```cpp
float voltage = readVoltage();  // Implement based on your sensor
float current = readCurrent();  // Implement based on your sensor
float power = voltage * current;  // Watts
```

#### 2. Offline Buffering
```cpp
// Store readings in SPIFFS/SD card when offline
struct PowerReading {
  unsigned long timestamp;
  float voltage;
  float current;
  float power;
  int activeSwitches;
  int totalSwitches;
};

std::vector<PowerReading> offlineBuffer;

void bufferReading(PowerReading reading) {
  offlineBuffer.push_back(reading);
  // Persist to SPIFFS/SD card
}
```

#### 3. Online/Offline Detection
```cpp
bool isOnline() {
  return WiFi.status() == WL_CONNECTED && mqttClient.connected();
}

void submitReading() {
  PowerReading reading = collectReading();
  
  if (isOnline()) {
    submitToServer(reading);
  } else {
    bufferReading(reading);
  }
}
```

#### 4. Reconnection Sync
```cpp
void onReconnect() {
  if (offlineBuffer.size() > 0) {
    syncOfflineReadings(offlineBuffer);
    offlineBuffer.clear();
  }
}
```

## Dashboard API Endpoints

### Current Power
`GET /api/power-analytics/current/:deviceId`

Returns real-time power consumption and device status.

### Daily Consumption
`GET /api/power-analytics/daily/:deviceId?startDate=2024-01-01&endDate=2024-01-31`

Returns daily aggregated consumption data.

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "energyKwh": 12.5,
    "cost": 93.75,
    "avgPower": 520.83,
    "maxPower": 1200,
    "minPower": 0,
    "readingCount": 1440,
    "onlineReadings": 1200,
    "offlineReadings": 240
  }
]
```

### Monthly Consumption
`GET /api/power-analytics/monthly/:deviceId?year=2024`

Returns monthly aggregated consumption data.

### Yearly Consumption
`GET /api/power-analytics/yearly/:deviceId?startYear=2023&endYear=2024`

Returns yearly aggregated consumption data.

### Today's Hourly Consumption
`GET /api/power-analytics/today-hourly/:deviceId`

Returns hourly breakdown for today.

### Classroom Consumption
`GET /api/power-analytics/classroom/:classroom?startDate=2024-01-01&endDate=2024-01-31`

Returns consumption for all devices in a classroom.

### All Devices Summary
`GET /api/power-analytics/all-devices?startDate=2024-01-01&endDate=2024-01-31`

Returns consumption summary for all devices with online/offline status.

### Cost Comparison
`GET /api/power-analytics/cost-comparison/:deviceId?period=month`

Compares current period with previous (day/week/month).

### Peak Usage Hours
`GET /api/power-analytics/peak-hours/:deviceId?days=7`

Returns top 5 peak consumption hours.

## Power Settings API

### Get Settings
`GET /api/power-settings/:deviceId`

Returns current price and calibration settings.

### Update Price
`PUT /api/power-settings/:deviceId/price`

**Body:**
```json
{
  "pricePerUnit": 8.5
}
```

### Update Calibration
`PUT /api/power-settings/:deviceId/calibration`

**Body:**
```json
{
  "consumptionFactor": 0.95
}
```

Calibration factors:
- `1.0` = No adjustment
- `0.9` = 10% reduction
- `1.1` = 10% increase

### Update Both Settings
`PUT /api/power-settings/:deviceId`

**Body:**
```json
{
  "pricePerUnit": 8.5,
  "consumptionFactor": 0.95
}
```

### Bulk Update Price
`PUT /api/power-settings/bulk/price`

**Body:**
```json
{
  "deviceIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "pricePerUnit": 8.5
}
```

## Energy Calculations

### Power
```
Power (W) = Voltage (V) × Current (A)
```

### Energy
```
Energy (Wh) = Power (W) × Time (hours)
Energy (kWh) = Energy (Wh) / 1000
```

### Cost
```
Cost (₹) = Energy (kWh) × Price per kWh
```

### Cumulative Energy
```
Total Energy = Sum of all incremental energy readings
```

## Data Consistency Rules

1. **No Historical Data Deletion**
   - Old readings are never deleted automatically
   - Use manual cleanup scripts if needed

2. **Duplicate Prevention**
   - Unique constraint on `deviceId` + `timestamp`
   - `readingId` format: `{deviceId}_{timestamp_epoch}`

3. **Chronological Ordering**
   - Offline readings sorted by timestamp before insertion
   - Cumulative energy calculated in order

4. **Cost Recalculation**
   - Stored costs do not update when price changes
   - New readings use current price
   - Use analytics API to recalculate with new price

## Migration

### Running the Migration

```bash
cd backend
node scripts/migratePowerReadings.js
```

**Warning:** This drops all existing power consumption data. Backup your database first!

### What Gets Dropped
- `powerconsumptionlogs`
- `energylogs`
- `dailyconsumptions`
- `monthlyconsumptions`

### What Gets Created
- `powerreadings` collection with indexes

## Database Indexes

The PowerReading model creates these indexes automatically:
- `deviceId` + `timestamp` (descending) - Device history
- `classroom` + `timestamp` (descending) - Classroom analytics
- `timestamp` (descending) - Recent readings
- `deviceId` + `timestamp` (ascending, unique) - Duplicate prevention
- `status` + `timestamp` (descending) - Filter by online/offline

## WebSocket Events

### From Backend to Dashboard

**powerReading** - Real-time reading received
```json
{
  "deviceId": "507f1f77bcf86cd799439011",
  "deviceName": "Lab 1 Controller",
  "power": 520.5,
  "energy": 8.675,
  "cost": 0.065,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**readingsSynced** - Offline sync completed
```json
{
  "deviceId": "507f1f77bcf86cd799439011",
  "deviceName": "Lab 1 Controller",
  "count": 120,
  "duplicates": 5
}
```

## Best Practices

### ESP32 Implementation

1. **Reading Interval**: 1 minute recommended
2. **Buffer Size**: Store at least 24 hours of readings
3. **Sync Strategy**: Sync on reconnect, then clear buffer
4. **Error Handling**: Retry failed submissions with exponential backoff
5. **Timestamp Accuracy**: Use NTP for accurate timestamps

### Dashboard Implementation

1. **Show Last Known Values**: Display cached data when device is offline
2. **Status Indicator**: Clearly show online/offline status
3. **Auto-refresh**: Update charts when device comes back online
4. **Data Gaps**: Handle missing data gracefully in charts
5. **Cost Updates**: Warn users that historical costs don't change with price updates

## Troubleshooting

### Device Not Reporting
1. Check WiFi connection
2. Verify MQTT broker connectivity
3. Check device authentication (MAC address and secret)
4. Review ESP32 serial logs

### Duplicate Readings
- System automatically handles duplicates
- `duplicates` count in sync response shows skipped entries

### Missing Data
- Check if device was offline during period
- Verify offline buffer implementation on ESP32
- Check sync endpoint logs

### Incorrect Consumption
- Verify voltage/current sensor calibration
- Adjust `consumptionFactor` if needed
- Check that power calculation matches hardware

## Testing

### Manual Test with cURL

**Submit Live Reading:**
```bash
curl -X POST http://localhost:3000/api/esp32/power-reading/AA:BB:CC:DD:EE:FF \
  -H "Content-Type: application/json" \
  -d '{
    "voltage": 230.5,
    "current": 2.3,
    "power": 529.15,
    "activeSwitches": 3,
    "totalSwitches": 4
  }'
```

**Sync Offline Readings:**
```bash
curl -X POST http://localhost:3000/api/esp32/sync-readings/AA:BB:CC:DD:EE:FF \
  -H "Content-Type: application/json" \
  -d '{
    "readings": [
      {
        "timestamp": "2024-01-15T10:00:00Z",
        "voltage": 230.2,
        "current": 2.1,
        "power": 483.42,
        "activeSwitches": 2,
        "totalSwitches": 4
      }
    ]
  }'
```

## Support

For issues or questions:
1. Check ESP32 serial logs
2. Review backend logs (`pm2 logs` or console output)
3. Verify database connectivity
4. Test API endpoints with cURL/Postman
