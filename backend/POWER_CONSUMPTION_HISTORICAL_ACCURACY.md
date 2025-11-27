# Power Consumption Historical Accuracy Implementation

## Overview

This implementation ensures that changes to power consumption settings **do not retroactively affect historical energy data**. Each activity log now stores the power consumption value at the time of the event, preserving historical accuracy.

## Problem Statement

Previously:
- Activity logs stored only switch on/off events with timestamps
- Power consumption calculations looked up **current** settings at query time
- Changing a device's power consumption setting would **retroactively change all historical data**

Example:
```
Yesterday: Light was 40W → consumed 0.4 kWh in 10 hours
Today: You change light to 60W
Query yesterday's data: Shows 0.6 kWh (WRONG!)
```

## Solution

Now:
- Each activity log stores `powerConsumption` at the time of the event
- Calculations use stored values for historical accuracy
- Fallback to current settings for legacy logs without stored values

## Changes Made

### 1. ActivityLog Model ✅
- Already had `powerConsumption` field (Number)
- Now actively used and stored with every switch event

### 2. Switch Toggle Functions ✅
**File:** `controllers/deviceController.js`

```javascript
// toggleSwitch now stores power consumption
const switchPowerConsumption = getBasePowerConsumption(
  updatedSwitch?.name || 'unknown',
  updatedSwitch?.type || 'relay'
);

await ActivityLog.create({
  // ... other fields
  powerConsumption: switchPowerConsumption // Stored at event time
});
```

### 3. Calculation Function ✅
**File:** `metricsService.js` - `calculatePreciseEnergyConsumption()`

```javascript
// PRIORITY 1: Use stored powerConsumption (historical accuracy)
let powerChange = activity.powerConsumption;

// FALLBACK: Calculate from current settings (legacy logs)
if (powerChange === undefined || powerChange === null) {
  powerChange = getBasePowerConsumption(switchName, switchType);
}
```

### 4. ESP32/MQTT Handlers ✅
**File:** `controllers/esp32Controller.js`

Both `updateDeviceStatus` and `sendCommand` now store power consumption values.

### 5. Migration Script ✅
**File:** `scripts/backfillPowerConsumption.js`

Backfills `powerConsumption` for existing activity logs based on current switch types.

## How to Deploy

### Step 1: Restart Backend
The code changes are already in place. Simply restart your backend server:

```bash
cd backend
npm start
```

### Step 2: Run Migration (Optional but Recommended)
Backfill existing activity logs with power consumption values:

```bash
cd backend
node scripts/backfillPowerConsumption.js
```

This will:
- Find all switch activity logs without powerConsumption
- Calculate power values based on switch types
- Update logs in the database
- Show progress and statistics

## Behavior After Implementation

### New Activity Logs
✅ **From now on**, every switch event stores power consumption at event time
- Changing power settings won't affect future queries of past data
- Historical data remains accurate

### Legacy Activity Logs
⚠️ **Existing logs** (before migration):
- If migration run: Uses backfilled power values (best guess)
- If not migrated: Falls back to current power settings (old behavior)

### Frontend Settings Changes
When you change power consumption in the frontend:
- ✅ **Past data**: Uses stored values (unchangeable)
- ✅ **Future data**: Uses new values
- ✅ **Real-time calculations**: Immediately reflect new values

## Example Scenario

```javascript
// Jan 1: Light is 40W
// User toggles light ON → ActivityLog stores: { powerConsumption: 40 }
// Light runs for 10 hours → Energy = 0.4 kWh

// Jan 15: User changes light power to 60W in settings

// Query Jan 1 data:
// - Uses stored value: 40W
// - Shows: 0.4 kWh ✅ CORRECT

// Future toggles (Jan 15+):
// - New logs store: { powerConsumption: 60 }
// - Uses: 60W going forward ✅ CORRECT
```

## Database Schema

### ActivityLog
```javascript
{
  deviceId: ObjectId,
  deviceName: String,
  switchId: String,
  switchName: String,
  action: String, // 'on', 'off', 'manual_on', etc.
  triggeredBy: String,
  timestamp: Date,
  powerConsumption: Number, // ⭐ Stored at event time
  // ... other fields
}
```

## Testing

### Test Historical Accuracy
1. Toggle a light ON/OFF a few times
2. Check analytics to see current consumption/cost
3. Change the light's power consumption in settings
4. Re-check analytics for the same historical period
5. ✅ Values should remain unchanged

### Test Future Calculations
1. Change power consumption setting
2. Toggle switches after the change
3. Check analytics
4. ✅ New values should use updated power consumption

## Files Modified

1. ✅ `controllers/deviceController.js` - toggleSwitch stores power
2. ✅ `controllers/esp32Controller.js` - ESP32 handlers store power
3. ✅ `metricsService.js` - calculatePreciseEnergyConsumption uses stored power
4. ✅ `scripts/backfillPowerConsumption.js` - Migration script created

## Benefits

1. **Historical Accuracy** - Past data cannot be accidentally changed
2. **Audit Trail** - Know exactly what power settings were used at any time
3. **Data Integrity** - Energy calculations remain consistent
4. **Flexibility** - Can adjust current settings without affecting past
5. **Compliance** - Accurate records for billing/reporting

## Notes

- Migration script is safe to run multiple times (idempotent)
- Logs without switch info will be skipped during migration
- Current power settings are still used as fallback for legacy logs
- All new activity logs automatically include powerConsumption

## Support

If you encounter issues:
1. Check that backend restarted successfully
2. Verify migration ran without errors
3. Check activity logs in MongoDB have `powerConsumption` field
4. Review console logs for calculation errors

---

**Implementation Date:** October 27, 2025  
**Version:** 1.0  
**Status:** ✅ Complete
