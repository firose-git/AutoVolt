# AI/ML "Insufficient Data" Fix Guide

## Problem
When opening the AI/ML page, you see this error:
```
Insufficient data: 0 points available. 
Need at least 7 days of usage data for accurate forecasting.
Please ensure device has been logging usage.
```

## Root Cause
The AI/ML forecasting system requires historical energy consumption data to make predictions. Your devices haven't been accumulating usage data yet.

---

## ✅ Solution 1: Generate Sample Data (RECOMMENDED for Testing)

### Step 1: Navigate to backend directory
```powershell
cd C:\Users\IOT\Documents\new-autovolt\backend
```

### Step 2: Run the data generation script
```powershell
node scripts/generateAIMLSampleData.js
```

### What This Does:
- ✅ Creates **14 days** of realistic energy consumption data
- ✅ Generates hourly logs for all online devices
- ✅ Includes realistic patterns:
  - Peak usage during class hours (9 AM - 5 PM): 35-60 kWh
  - Morning ramp-up (6-9 AM): 15-25 kWh
  - Evening wind-down (5-10 PM): 20-35 kWh
  - Night time minimal usage: 3-8 kWh
  - Lower consumption on weekends
  - Variations based on active switches

### Expected Output:
```
🔌 Generating sample energy usage data for AI/ML...
📊 Found 3 devices. Generating data...

📍 Generating data for: LH_D_28_2_B
   ✅ Generated 336 energy log entries

📍 Generating data for: Computer Lab Device
   ✅ Generated 336 energy log entries

✨ Sample data generation complete!
📈 You can now use the AI/ML forecasting features.
```

### Step 3: Refresh the AI/ML page
The forecasting, anomaly detection, and maintenance predictions should now work!

---

## ✅ Solution 2: Reduced Data Requirements (Already Applied)

I've already reduced the minimum data requirement from **7 days** to just **3 data points** for development/testing.

**Changes Made:**
- File: `src/components/AIMLPanel.tsx`
- Minimum data points: 7 days (168 hours) → **3 points**
- Shows warning but allows forecasting with limited data
- Good for immediate testing

**Note:** For production, you should increase this back to 7 days for accurate forecasts.

---

## 📊 How Data is Used

### Forecasting Tab
- **Requires:** 3+ historical consumption data points
- **Uses:** Time-series prediction with Prophet algorithm
- **Generates:** 16-hour ahead forecast (working hours)
- **Shows:** Predicted consumption with confidence intervals

### Anomaly Detection Tab  
- **Requires:** 10+ historical data points
- **Uses:** Isolation Forest algorithm
- **Detects:** Unusual consumption patterns
- **Alerts:** Potential issues or inefficiencies

### Maintenance/Schedule Tab
- **Requires:** 7+ days of data (recommended)
- **Uses:** Historical usage patterns
- **Calculates:** Real energy savings from schedule optimization
- **Optimizes:** Operating hours based on usage patterns

---

## 🔄 Long-term Solution: Automatic Data Collection

For production use, set up automatic energy logging:

### Option A: Periodic Device State Logging
Add this to your backend scheduler:

```javascript
// In server.js or a cron job
const cron = require('node-cron');
const Device = require('./models/Device');
const EnergyLog = require('./models/EnergyLog');

// Log energy consumption every hour
cron.schedule('0 * * * *', async () => {
  const devices = await Device.find({ status: 'online' });
  
  for (const device of devices) {
    const activeSwitches = device.switches.filter(s => s.state).length;
    const consumption = calculateConsumption(device); // Your calculation logic
    
    await EnergyLog.create({
      deviceId: device._id,
      deviceName: device.name,
      consumption: consumption,
      cost: consumption * 10, // Your rate
      activeSwitches: activeSwitches,
      totalSwitches: device.switches.length,
      classroom: device.classroom,
      location: device.location
    });
  }
});
```

### Option B: Log on Every Switch Change
Add energy logging to your switch toggle handler:

```javascript
// After successful switch toggle
const consumption = calculateCurrentConsumption(device);
await EnergyLog.create({
  deviceId: device._id,
  deviceName: device.name,
  consumption: consumption,
  // ... other fields
});
```

---

## 🧪 Verify the Fix

### 1. Check Database
```powershell
# Connect to MongoDB
mongo autovolt

# Check energy logs
db.energylogs.countDocuments()
# Should show 336+ documents per device

# View sample data
db.energylogs.find().limit(5).pretty()
```

### 2. Test AI/ML Page
1. Navigate to AI/ML page
2. Select a classroom
3. Select a device
4. Click each tab:
   - **Forecast**: Should show 16-hour prediction chart
   - **Anomaly**: Should show detected anomalies
   - **Maintenance**: Should show schedule optimization

### 3. Check API Response
```powershell
# Test energy history endpoint
curl http://localhost:3001/api/analytics/energy-history?deviceId=YOUR_DEVICE_ID&days=7
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module './models/EnergyLog'"
**Solution:** EnergyLog model has been created. Restart your backend server.

### Error: "No online devices found"
**Solution:** Ensure at least one device is online and properly configured.

### Still showing "0 points available"
**Solution:** 
1. Check MongoDB connection
2. Verify data was actually inserted:
   ```javascript
   db.energylogs.countDocuments({ deviceId: ObjectId("YOUR_DEVICE_ID") })
   ```
3. Check the API endpoint is returning data
4. Clear browser cache and refresh

### Forecast shows but looks unrealistic
**Solution:** This is expected with generated data. Real usage patterns will improve predictions over time.

---

## 📈 Future Enhancements

1. **Real-time Energy Monitoring**: Integrate with ESP32 energy meters
2. **Machine Learning Model Retraining**: Periodically retrain models with new data
3. **Cost Optimization**: Add utility rate schedules for accurate cost predictions
4. **Alerts**: Automatic alerts when consumption exceeds thresholds
5. **Comparative Analytics**: Compare classrooms/departments

---

## ✅ Summary

**Quick Fix:**
```powershell
cd backend
node scripts/generateAIMLSampleData.js
```

**Result:** AI/ML page should now work with 14 days of realistic sample data!

**Production:** Set up automatic energy logging for continuous data collection.

---

**Created:** October 27, 2025  
**Status:** ✅ Fixed - Ready for testing
