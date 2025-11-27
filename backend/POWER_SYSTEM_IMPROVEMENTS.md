# Power Consumption System - Improvements & Optimizations

## 🔍 Current Issues & Recommended Improvements

### 1. **Data Validation & Error Handling** ⚠️

#### Issues:
- Missing validation for negative values
- No bounds checking on voltage/current readings
- Limited error messages for debugging

#### Improvements:

**Add input validation middleware:**
```javascript
// middleware/powerReadingValidator.js
const validatePowerReading = (req, res, next) => {
  const { voltage, current, power } = req.body;
  
  // Validation rules
  if (voltage < 0 || voltage > 300) {
    return res.status(400).json({ 
      error: 'Voltage out of range (0-300V)',
      received: voltage 
    });
  }
  
  if (current < 0 || current > 50) {
    return res.status(400).json({ 
      error: 'Current out of range (0-50A)',
      received: current 
    });
  }
  
  if (power && power < 0) {
    return res.status(400).json({ 
      error: 'Power cannot be negative',
      received: power 
    });
  }
  
  // Validate power calculation
  if (power && voltage && current) {
    const calculated = voltage * current;
    const difference = Math.abs(power - calculated);
    if (difference > calculated * 0.1) { // 10% tolerance
      return res.status(400).json({
        error: 'Power calculation mismatch',
        provided: power,
        calculated: calculated,
        difference: difference
      });
    }
  }
  
  next();
};

module.exports = { validatePowerReading };
```

### 2. **Performance Optimizations** ⚡

#### Issues:
- No caching for frequently accessed data
- Aggregation queries can be slow with large datasets
- No pagination on analytics endpoints

#### Improvements:

**A. Add Redis caching for current power:**
```javascript
const redis = require('redis');
const client = redis.createClient();

async function getCurrentPowerCached(deviceId) {
  const cacheKey = `power:current:${deviceId}`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const data = await getCurrentPower(deviceId);
  
  // Cache for 30 seconds
  await client.setEx(cacheKey, 30, JSON.stringify(data));
  
  return data;
}
```

**B. Add pagination to analytics:**
```javascript
router.get('/daily/:deviceId', async (req, res) => {
  const { startDate, endDate, page = 1, limit = 30 } = req.query;
  const skip = (page - 1) * limit;
  
  const dailyData = await PowerReading.aggregate([
    // ... existing aggregation
    { $skip: skip },
    { $limit: parseInt(limit) }
  ]);
  
  const total = await PowerReading.countDocuments({
    deviceId,
    timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
  
  res.json({
    data: dailyData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
```

**C. Add database indexes:**
```javascript
// Already added, but verify these exist:
powerReadingSchema.index({ deviceId: 1, timestamp: -1 });
powerReadingSchema.index({ classroom: 1, timestamp: -1 });
powerReadingSchema.index({ deviceId: 1, timestamp: 1 }, { unique: true });
```

### 3. **Energy Calculation Accuracy** 📊

#### Issues:
- Fixed 1-minute interval assumption may be incorrect
- No handling of variable intervals
- Cumulative energy drift over time

#### Improvements:

**Dynamic interval calculation:**
```javascript
exports.submitPowerReading = async (req, res) => {
  // ... existing code
  
  // Get last reading for this device
  const lastReading = await PowerReading.findOne({ deviceId: device._id })
    .sort({ timestamp: -1 })
    .limit(1);
  
  const now = new Date();
  let intervalHours = 1/60; // Default 1 minute
  
  if (lastReading) {
    // Calculate actual interval
    const intervalMs = now - lastReading.timestamp;
    intervalHours = intervalMs / (1000 * 60 * 60);
    
    // Sanity check - if interval > 1 hour, log warning
    if (intervalHours > 1) {
      logger.warn(`Large interval detected for device ${device.name}: ${intervalHours.toFixed(2)} hours`);
    }
    
    // Cap at 24 hours to prevent huge values
    if (intervalHours > 24) {
      intervalHours = 24;
    }
  }
  
  const energy = (power || voltage * current) * intervalHours;
  
  // ... rest of code
};
```

### 4. **Offline Data Integrity** 🔒

#### Issues:
- No checksum verification for offline data
- Clock drift on ESP32 can cause timestamp issues
- No detection of corrupted readings

#### Improvements:

**Add data integrity checks:**
```javascript
exports.syncOfflineReadings = async (req, res) => {
  const { readings, checksum } = req.body;
  
  // Verify checksum if provided
  if (checksum) {
    const calculated = crypto
      .createHash('md5')
      .update(JSON.stringify(readings))
      .digest('hex');
    
    if (calculated !== checksum) {
      return res.status(400).json({
        error: 'Checksum mismatch - data may be corrupted',
        expected: checksum,
        calculated
      });
    }
  }
  
  // Detect timestamp issues
  const now = Date.now();
  const futureReadings = readings.filter(r => 
    new Date(r.timestamp).getTime() > now
  );
  
  if (futureReadings.length > 0) {
    logger.warn(`Device ${macAddress} has ${futureReadings.length} future timestamps - possible clock drift`);
  }
  
  // ... rest of sync logic
};
```

### 5. **Real-Time Alerts** 🚨

#### Missing Feature:
- No alerts for abnormal consumption
- No notifications for devices going offline
- No threshold monitoring

#### Improvements:

**Add consumption monitoring:**
```javascript
// services/powerAlertService.js
class PowerAlertService {
  async checkAnomalies(reading) {
    const device = await Device.findById(reading.deviceId);
    
    // Check for high power consumption
    if (reading.power > device.maxPowerThreshold || 10000) {
      await this.sendAlert({
        type: 'high_power',
        device: device.name,
        power: reading.power,
        threshold: device.maxPowerThreshold
      });
    }
    
    // Check for sudden spike (> 50% increase)
    const lastReading = await PowerReading.findOne({ 
      deviceId: reading.deviceId,
      timestamp: { $lt: reading.timestamp }
    }).sort({ timestamp: -1 });
    
    if (lastReading) {
      const increase = ((reading.power - lastReading.power) / lastReading.power) * 100;
      if (increase > 50) {
        await this.sendAlert({
          type: 'power_spike',
          device: device.name,
          previous: lastReading.power,
          current: reading.power,
          increase: increase.toFixed(2)
        });
      }
    }
  }
  
  async sendAlert(alert) {
    // Send via WebSocket
    io.emit('powerAlert', alert);
    
    // Log to database
    await Alert.create(alert);
    
    // Send email/SMS if configured
    // ...
  }
}
```

### 6. **Data Retention & Cleanup** 🗑️

#### Issues:
- No automatic cleanup of old readings
- Database can grow indefinitely
- No archival strategy

#### Improvements:

**Add data retention policy:**
```javascript
// services/dataRetentionService.js
class DataRetentionService {
  constructor() {
    // Run cleanup daily at 2 AM
    cron.schedule('0 2 * * *', () => this.cleanupOldData());
  }
  
  async cleanupOldData() {
    const retentionDays = process.env.DATA_RETENTION_DAYS || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    logger.info(`Starting data cleanup - removing readings older than ${cutoffDate}`);
    
    // Option 1: Delete old readings
    const result = await PowerReading.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    logger.info(`Deleted ${result.deletedCount} old readings`);
    
    // Option 2: Archive to separate collection
    // const oldReadings = await PowerReading.find({ timestamp: { $lt: cutoffDate } });
    // await ArchivedPowerReading.insertMany(oldReadings);
    // await PowerReading.deleteMany({ timestamp: { $lt: cutoffDate } });
  }
  
  async aggregateOldData() {
    // Aggregate old daily data into monthly summaries
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Keep only aggregated data for old readings
    // Delete individual readings but keep daily summaries
  }
}
```

### 7. **API Rate Limiting & Security** 🔐

#### Issues:
- ESP32 endpoints not rate limited
- No device-specific rate limits
- Potential for abuse

#### Improvements:

**Add device-specific rate limiting:**
```javascript
const rateLimit = require('express-rate-limit');

// Rate limit per device
const deviceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 2 readings per second max
  keyGenerator: (req) => req.params.macAddress,
  message: 'Too many readings from this device'
});

router.post('/power-reading/:macAddress', 
  deviceRateLimiter,
  esp32Controller.submitPowerReading
);

// Rate limit for offline sync
const syncRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 syncs per 5 minutes
  keyGenerator: (req) => req.params.macAddress,
  message: 'Sync rate limit exceeded'
});

router.post('/sync-readings/:macAddress',
  syncRateLimiter,
  esp32Controller.syncOfflineReadings
);
```

### 8. **Dashboard Optimization** 📈

#### Issues:
- No data compression for charts
- Large payloads for date ranges
- No incremental updates

#### Improvements:

**Add data downsampling for charts:**
```javascript
async function getDailyConsumptionOptimized(deviceId, startDate, endDate, maxDataPoints = 30) {
  const data = await getDailyConsumption(deviceId, startDate, endDate);
  
  // If data points exceed max, downsample
  if (data.length > maxDataPoints) {
    const step = Math.ceil(data.length / maxDataPoints);
    return data.filter((_, index) => index % step === 0);
  }
  
  return data;
}

// Or aggregate into weekly data for long ranges
async function getOptimizedConsumption(deviceId, startDate, endDate) {
  const daysDiff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 90) {
    // Use weekly aggregation for > 3 months
    return await getWeeklyConsumption(deviceId, startDate, endDate);
  } else if (daysDiff > 30) {
    // Use daily for 1-3 months
    return await getDailyConsumption(deviceId, startDate, endDate);
  } else {
    // Use hourly for < 1 month
    return await getHourlyConsumption(deviceId, startDate, endDate);
  }
}
```

### 9. **Export & Reporting** 📄

#### Missing Feature:
- No CSV/Excel export
- No PDF reports
- No scheduled reports

#### Improvements:

**Add export endpoint:**
```javascript
router.get('/export/:deviceId', authenticate, async (req, res) => {
  const { format = 'csv', startDate, endDate } = req.query;
  
  const data = await PowerReading.find({
    deviceId: req.params.deviceId,
    timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).sort({ timestamp: 1 });
  
  if (format === 'csv') {
    const csv = convertToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=power-data-${deviceId}.csv`);
    res.send(csv);
  } else if (format === 'excel') {
    const workbook = createExcelWorkbook(data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=power-data-${deviceId}.xlsx`);
    await workbook.xlsx.write(res);
  }
});
```

### 10. **Testing & Monitoring** 🧪

#### Issues:
- Limited test coverage
- No performance monitoring
- No health checks specific to power system

#### Improvements:

**Add health check endpoint:**
```javascript
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const dbStatus = await mongoose.connection.readyState === 1;
    
    // Check recent readings
    const recentCount = await PowerReading.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });
    
    // Check for stuck devices
    const devices = await Device.find();
    const stuckDevices = [];
    
    for (const device of devices) {
      const lastReading = await PowerReading.findOne({ deviceId: device._id })
        .sort({ timestamp: -1 });
      
      if (lastReading) {
        const minutesAgo = (Date.now() - lastReading.timestamp) / (1000 * 60);
        if (minutesAgo > 10) {
          stuckDevices.push({
            name: device.name,
            lastSeen: lastReading.timestamp
          });
        }
      }
    }
    
    res.json({
      status: 'healthy',
      database: dbStatus ? 'connected' : 'disconnected',
      recentReadings: recentCount,
      stuckDevices: stuckDevices.length,
      stuckDevicesList: stuckDevices
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## 🎯 Priority Implementation Order

### High Priority (Implement First):
1. ✅ Input validation (prevents bad data)
2. ✅ Dynamic interval calculation (accuracy)
3. ✅ Rate limiting (security)
4. ✅ Pagination (performance)

### Medium Priority (Implement Soon):
5. ⚠️ Caching with Redis (performance)
6. ⚠️ Offline data integrity (reliability)
7. ⚠️ Alerts & monitoring (operations)
8. ⚠️ Health checks (monitoring)

### Low Priority (Nice to Have):
9. 📋 Data retention policy (maintenance)
10. 📋 Export/reporting (features)
11. 📋 Data downsampling (optimization)

## 📝 Quick Wins (Easy Improvements)

### 1. Add request ID for debugging:
```javascript
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

### 2. Add response time logging:
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});
```

### 3. Add device metadata to readings:
```javascript
{
  deviceId,
  timestamp,
  power,
  energy,
  metadata: {
    firmware: '1.2.0',
    uptime: 3600,
    freeHeap: 50000,
    rssi: -65
  }
}
```

### 4. Add bulk operations support:
```javascript
router.post('/power-readings/bulk', async (req, res) => {
  const { readings } = req.body; // Array of readings from multiple devices
  // Process in parallel
  const results = await Promise.all(
    readings.map(r => processPowerReading(r))
  );
  res.json({ success: true, processed: results.length });
});
```

## 🔧 Configuration Recommendations

Add to `.env`:
```bash
# Power System Configuration
POWER_READING_INTERVAL=60000        # Default interval in ms
MAX_VOLTAGE=300                     # Max voltage before alert
MAX_CURRENT=50                      # Max current before alert  
MAX_POWER=15000                     # Max power before alert
DATA_RETENTION_DAYS=365             # Keep data for 1 year
ENABLE_POWER_ALERTS=true            # Enable alerts
CACHE_TTL=30                        # Cache TTL in seconds
MAX_SYNC_READINGS=1000              # Max readings per sync
```

## 📊 Monitoring Metrics to Track

Add these metrics:
- Average readings per minute
- Number of active devices
- Database query times
- Cache hit ratio
- Alert frequency
- Offline sync frequency
- Data integrity errors
- API response times

## ✅ Testing Checklist

Run the test suite:
```bash
# Make sure server is running on port 3001
node tests/powerConsumptionTest.js
```

Expected results:
- ✅ All 10 tests should pass
- ✅ No timeout errors
- ✅ No database errors
- ✅ Duplicate prevention working
- ✅ All endpoints responding correctly

##Final Recommendations

The system is solid but would benefit from:
1. Better validation
2. Performance optimizations
3. Monitoring & alerts
4. Data retention policies

Start with high-priority items and gradually implement medium/low priority improvements.
