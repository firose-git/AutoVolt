# Runtime-Based Energy Calculation System

## Overview

This system calculates energy consumption based on **how long switches are ON**, not on periodic power readings. This is **much more accurate** and eliminates the "missing data" problem.

## 📊 How It Works

### 1. **Track Switch State Changes**

Every time a switch turns ON or OFF, the system logs it in the `SwitchStateLog` collection:

```javascript
// When switch turns ON
{
  deviceId: "device123",
  switchId: "switch456",
  switchName: "Classroom Light 1",
  state: true,  // ON
  timestamp: "2025-10-27T14:00:00Z",
  powerRating: 40,  // 40 Watts
  source: "app"
}

// When switch turns OFF (automatically calculates energy)
{
  deviceId: "device123",
  switchId: "switch456",
  switchName: "Classroom Light 1",
  state: false,  // OFF
  timestamp: "2025-10-27T17:00:00Z",
  powerRating: 40,
  runtimeMinutes: 180,  // 3 hours
  energyConsumed: 120,  // 40W × 3h = 120 Wh = 0.12 kWh
  cost: 0.9,  // 0.12 kWh × ₹7.5 = ₹0.90
  onEventId: "ref_to_on_event"
}
```

### 2. **Energy Formula**

```
Energy (Wh) = Power Rating (W) × Runtime (hours)

Example:
- 40W bulb ON for 3 hours = 40 × 3 = 120 Wh = 0.12 kWh
- 1500W AC ON for 2 hours = 1500 × 2 = 3000 Wh = 3 kWh
- 75W fan ON for 8 hours = 75 × 8 = 600 Wh = 0.6 kWh
```

### 3. **Automatic Calculation**

When a switch turns OFF:
1. System finds the most recent ON event for that switch
2. Calculates how long it was ON (runtime)
3. Multiplies power rating by runtime to get energy
4. Calculates cost based on price per unit
5. Links OFF event to ON event for tracking

## 🔧 Configuration

### Set Power Ratings for Each Switch

You need to configure the power rating (in Watts) for each switch in your devices:

```javascript
// In Device model
{
  "switches": [
    {
      "name": "LED Light 1",
      "type": "light",
      "gpio": 23,
      "powerRating": 40  // 40W LED bulb
    },
    {
      "name": "Ceiling Fan",
      "type": "fan",
      "gpio": 22,
      "powerRating": 75  // 75W fan
    },
    {
      "name": "AC Unit",
      "type": "ac",
      "gpio": 21,
      "powerRating": 1500  // 1500W AC
    },
    {
      "name": "Projector",
      "type": "projector",
      "gpio": 19,
      "powerRating": 300  // 300W projector
    }
  ]
}
```

### Typical Power Ratings

| Device Type | Power Rating (W) |
|------------|------------------|
| LED Bulb (5W) | 5 |
| LED Bulb (9W) | 9 |
| LED Bulb (15W) | 15 |
| CFL Bulb | 18-23 |
| Tube Light | 40 |
| Ceiling Fan | 75 |
| Table Fan | 50 |
| Exhaust Fan | 35 |
| Projector | 200-400 |
| Smart Board | 150-300 |
| Window AC (1 ton) | 1200 |
| Window AC (1.5 ton) | 1500 |
| Split AC (1 ton) | 900 |
| Split AC (1.5 ton) | 1400 |
| Desktop Computer | 200-400 |
| Laptop Charger | 65-90 |
| Refrigerator | 150-300 |
| Water Heater | 1500-3000 |

## 📈 Advantages Over Periodic Readings

### Old System (Periodic Power Readings)
❌ Missing data if readings not collected every minute  
❌ Inaccurate if device goes offline  
❌ Wasted bandwidth sending constant readings  
❌ Data gaps lead to wrong calculations  

**Example:** If readings are every 5 minutes and a light is ON for only 3 minutes, it might not be captured at all!

### New System (Runtime-Based)
✅ Captures **exact** ON/OFF times  
✅ Works even if device goes offline  
✅ No missing data - every switch state change is logged  
✅ Much lower database usage (only logs state changes)  
✅ More accurate energy calculations  

**Example:** A light ON for exactly 3 minutes will be calculated as 3 minutes, not estimated!

## 🎯 Use Cases

### 1. Daily Energy Report
```javascript
const today = new Date();
today.setHours(0,0,0,0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const consumption = await SwitchStateLog.getRuntimeConsumption(
  deviceId, 
  today, 
  tomorrow
);

console.log(`Today's consumption: ${consumption.totalEnergyKwh} kWh`);
console.log(`Total cost: ₹${consumption.totalCost}`);
console.log(`Total runtime: ${consumption.totalRuntimeHours} hours`);
```

### 2. Per-Switch Analysis
```javascript
const switchData = await SwitchStateLog.getPerSwitchConsumption(
  deviceId,
  startDate,
  endDate
);

// Output:
// [
//   { switchName: "AC Unit", energyKwh: 12.5, cost: 93.75, runtimeHours: 8.33 },
//   { switchName: "Projector", energyKwh: 2.4, cost: 18, runtimeHours: 8 },
//   { switchName: "Lights", energyKwh: 0.32, cost: 2.4, runtimeHours: 8 }
// ]
```

### 3. Currently Active Switches
```javascript
const active = await SwitchStateLog.calculateActiveEnergy(deviceId);

console.log(`${active.activeSwitchCount} switches currently ON`);
console.log(`Consuming ${active.activeEnergyKwh} kWh so far`);
console.log(`Current cost: ₹${active.activeCost}`);
```

### 4. Daily Breakdown
```javascript
const daily = await SwitchStateLog.getDailyRuntimeConsumption(
  deviceId,
  startDate,
  endDate
);

// Output:
// [
//   { date: "2025-10-20", energyKwh: 15.6, cost: 117, runtimeHours: 45.2 },
//   { date: "2025-10-21", energyKwh: 18.3, cost: 137.25, runtimeHours: 52.8 },
//   ...
// ]
```

## 🔌 Integration with Existing System

### When a Switch is Toggled (via any method)

You need to add this to your switch toggle code:

```javascript
const SwitchStateLog = require('./models/SwitchStateLog');
const Device = require('./models/Device');

// When toggling a switch
async function toggleSwitch(deviceId, switchGpio, newState) {
  const device = await Device.findById(deviceId);
  const switchObj = device.switches.find(s => s.gpio === switchGpio);
  
  // Update switch state
  switchObj.state = newState;
  await device.save();
  
  // Log state change for energy tracking
  const pricePerUnit = device.powerSettings?.pricePerUnit || 7.5;
  const consumptionFactor = device.powerSettings?.consumptionFactor || 1.0;
  
  await SwitchStateLog.create({
    deviceId: device._id,
    deviceName: device.name,
    classroom: device.classroom,
    switchId: switchObj._id,
    switchName: switchObj.name,
    switchType: switchObj.type,
    gpio: switchObj.gpio,
    state: newState,
    timestamp: new Date(),
    powerRating: switchObj.powerRating || 0,
    pricePerUnit,
    consumptionFactor,
    source: 'app' // or 'schedule', 'pir', 'voice', etc.
  });
  
  return switchObj;
}
```

### Handle Switches That Were ON During System Restart

If the system restarts, switches might already be ON. You need to log their current state:

```javascript
// On system startup
async function syncExistingSwitchStates() {
  const devices = await Device.find({ status: 'online' });
  
  for (const device of devices) {
    const pricePerUnit = device.powerSettings?.pricePerUnit || 7.5;
    
    for (const switchObj of device.switches) {
      if (switchObj.state === true) {
        // Switch is ON - check if we have an ON event already
        const existingOnEvent = await SwitchStateLog.findOne({
          deviceId: device._id,
          switchId: switchObj._id,
          state: true,
          'metadata.offEventId': { $exists: false }
        }).sort({ timestamp: -1 });
        
        if (!existingOnEvent) {
          // Create ON event for currently active switch
          await SwitchStateLog.create({
            deviceId: device._id,
            deviceName: device.name,
            classroom: device.classroom,
            switchId: switchObj._id,
            switchName: switchObj.name,
            switchType: switchObj.type,
            gpio: switchObj.gpio,
            state: true,
            timestamp: new Date(),
            powerRating: switchObj.powerRating || 0,
            pricePerUnit,
            source: 'system'
          });
        }
      }
    }
  }
}
```

## 📊 Dashboard Integration

### Real-time Power Display

```javascript
// Show current power consumption (from active switches)
const activeEnergy = await SwitchStateLog.calculateActiveEnergy(deviceId);
const activeSwitches = await SwitchStateLog.getActiveSwitches(deviceId);

// Calculate current power draw
const currentPower = activeSwitches.reduce(
  (sum, log) => sum + log.powerRating, 
  0
);

console.log(`Current Power: ${currentPower}W`);
console.log(`Energy consumed so far (active switches): ${activeEnergy.activeEnergyKwh} kWh`);
```

### Today's Total Consumption

```javascript
const today = new Date();
today.setHours(0,0,0,0);

// Get completed sessions (switches that turned OFF)
const completed = await SwitchStateLog.getRuntimeConsumption(
  deviceId,
  today,
  new Date()
);

// Get ongoing sessions (currently ON switches)
const active = await SwitchStateLog.calculateActiveEnergy(deviceId);

const totalToday = {
  energyKwh: completed.totalEnergyKwh + active.activeEnergyKwh,
  cost: completed.totalCost + active.activeCost
};

console.log(`Today: ${totalToday.energyKwh.toFixed(2)} kWh (₹${totalToday.cost.toFixed(2)})`);
```

## 🚀 Migration Steps

1. **Add `powerRating` to existing devices**
   ```javascript
   // Update all devices to have power ratings
   const devices = await Device.find();
   for (const device of devices) {
     for (const sw of device.switches) {
       if (!sw.powerRating) {
         // Set default based on type
         sw.powerRating = getDefaultPowerRating(sw.type);
       }
     }
     await device.save();
   }
   
   function getDefaultPowerRating(type) {
     const defaults = {
       'light': 40,
       'fan': 75,
       'ac': 1500,
       'projector': 300,
       'relay': 100,
       'outlet': 100
     };
     return defaults[type] || 100;
   }
   ```

2. **Add logging to switch toggle handlers**
   - Update WebSocket switch toggle
   - Update MQTT switch toggle
   - Update schedule-based toggles
   - Update PIR-based toggles
   - Update API toggle endpoints

3. **Create initial state logs for currently ON switches**
   - Run the `syncExistingSwitchStates()` function once

4. **Update analytics to use SwitchStateLog**
   - Replace PowerReading-based calculations with SwitchStateLog queries

## ✅ Testing

```javascript
// Test with a single switch
const device = await Device.findOne();
const sw = device.switches[0];

// Turn ON
await SwitchStateLog.create({
  deviceId: device._id,
  deviceName: device.name,
  switchId: sw._id,
  switchName: sw.name,
  switchType: sw.type,
  gpio: sw.gpio,
  state: true,
  powerRating: 40,
  pricePerUnit: 7.5
});

// Wait 10 seconds...
await new Promise(resolve => setTimeout(resolve, 10000));

// Turn OFF
await SwitchStateLog.create({
  deviceId: device._id,
  deviceName: device.name,
  switchId: sw._id,
  switchName: sw.name,
  switchType: sw.type,
  gpio: sw.gpio,
  state: false,
  powerRating: 40,
  pricePerUnit: 7.5
});

// Check result
const logs = await SwitchStateLog.find({ switchId: sw._id }).sort({ timestamp: -1 }).limit(2);
console.log('OFF event:', logs[0]);
// Should show runtimeMinutes ≈ 0.167 (10 seconds)
// energyConsumed ≈ 0.111 Wh (40W × 0.167min / 60)
```

## 🎯 Expected Accuracy

- **Runtime precision:** Millisecond-accurate
- **Energy calculation:** As accurate as the configured power ratings
- **No data loss:** Every ON/OFF event is captured
- **Offline resilience:** Logs can be created retroactively when device reconnects

---

**This system is MUCH more accurate than periodic sampling!** No more "missing data" problems. Just configure the power ratings correctly and you'll have precise energy tracking.
