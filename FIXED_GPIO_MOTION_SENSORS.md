# Fixed GPIO Configuration for Motion Sensors

**Project**: AutoVolt Smart Classroom  
**Date**: October 19, 2025  
**Status**: ✅ IMPLEMENTED - SIMPLIFIED

---

## 🎯 Overview

Motion sensor GPIO pins are now **FIXED** and **NOT CONFIGURABLE** via the web UI. This simplification:
- ✅ Prevents user configuration errors
- ✅ Eliminates pin conflicts
- ✅ Standardizes hardware setup
- ✅ Simplifies deployment across multiple classrooms

---

## 📌 Fixed GPIO Pin Assignment

| Sensor Type | GPIO Pin | Description | Configurable? |
|-------------|----------|-------------|---------------|
| **HC-SR501 (PIR)** | **GPIO 34** | Input-only pin, ADC1_CH6 | ❌ **FIXED** |
| **RCWL-0516 (Microwave)** | **GPIO 35** | Input-only pin, ADC1_CH7 | ❌ **FIXED** |

### **Wiring Diagram**:
```
╔══════════════════════════════════════════════════════════════╗
║                   FIXED MOTION SENSOR WIRING                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  HC-SR501 (PIR)         ESP32         RCWL-0516 (Microwave) ║
║  ──────────────         ─────         ─────────────────────  ║
║                                                              ║
║  VCC (5V)         →     VIN           VIN (3.3V)      →  3.3V║
║  GND              →     GND           GND             →  GND ║
║  OUT              →     GPIO 34 ✅    OUT             →  GPIO 35 ✅
║                         (FIXED)                        (FIXED)║
║                                                              ║
║  ⚠️ These pins CANNOT be changed in web UI                   ║
║  ⚠️ Always wire to GPIO 34 (PIR) and GPIO 35 (Microwave)    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🔧 What Is Configurable vs Fixed

### ✅ **Configurable via Web UI**:
- Sensor type selection (PIR only / Microwave only / Both)
- Auto-off delay (0-300 seconds)
- Sensitivity (0-100%)
- Detection range (1-10 meters)
- Detection logic (AND / OR / Weighted) - for dual mode only

### ❌ **Fixed (NOT Configurable)**:
- GPIO 34 - Always HC-SR501 PIR sensor
- GPIO 35 - Always RCWL-0516 Microwave sensor

---

## 📋 Sensor Type Selection Behavior

### **Single PIR Mode** (`pirSensorType: 'hc-sr501'`):
- Uses: **GPIO 34 only**
- GPIO 35: Not used
- User selects: PIR sensitivity, auto-off delay, detection range

### **Single Microwave Mode** (`pirSensorType: 'rcwl-0516'`):
- Uses: **GPIO 35 only**
- GPIO 34: Not used
- User selects: Microwave sensitivity, auto-off delay, detection range

### **Dual Mode** (`pirSensorType: 'both'`):
- Uses: **GPIO 34 (PIR) + GPIO 35 (Microwave)**
- User selects: Detection logic (AND/OR/Weighted), sensitivity, auto-off delay
- Both sensors work independently and fusion logic determines trigger

---

## 🌐 Web UI Display

### **Device Configuration Dialog**:

When user enables motion sensor, they see:

```
┌──────────────────────────────────────────────────┐
│ Motion Sensor Type                               │
│ ┌──────────────────────────────────────────────┐ │
│ │ HC-SR501 (PIR Only)                          │ │
│ │ RCWL-0516 (Microwave Only)                   │ │
│ │ 🔥 Both Sensors (Dual Mode) - RECOMMENDED   │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ ℹ️ GPIO Pin Configuration (Fixed)                │
│                                                  │
│ • GPIO 34: HC-SR501 PIR sensor (Input-only)     │
│ • GPIO 35: RCWL-0516 Microwave (Input-only)     │
│ • No pin conflicts with relays ✅                │
│ • No pin conflicts with manual switches ✅       │
└──────────────────────────────────────────────────┘
```

**NO GPIO selection dropdowns are shown!**

---

## 📡 MQTT Configuration Message

### **Backend → ESP32** (Topic: `esp32/config`):

```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "secret": "device_secret",
  "switches": [ /* ... */ ],
  "motionSensor": {
    "enabled": true,
    "type": "both",
    "gpio": 34,              // ← ALWAYS 34 for PIR (fixed by backend)
    "autoOffDelay": 60,
    "sensitivity": 75,
    "detectionRange": 5,
    "dualMode": true,
    "secondaryGpio": 35,     // ← ALWAYS 35 for Microwave (fixed by backend)
    "secondaryType": "rcwl-0516",
    "detectionLogic": "and"
  }
}
```

**Backend Logic** (`backend/server.js`):
```javascript
motionSensor: {
  enabled: device.pirEnabled || false,
  type: device.pirSensorType || 'hc-sr501',
  gpio: device.pirSensorType === 'rcwl-0516' ? 35 : 34,  // ← FIXED
  // ...
  secondaryGpio: 35,  // ← FIXED
  secondaryType: 'rcwl-0516'  // ← FIXED
}
```

---

## 🔒 Database Schema (Simplified)

**File**: `backend/models/Device.js`

```javascript
// OLD (Complex - had user-selectable GPIO):
pirGpio: { type: Number },
secondaryMotionGpio: { type: Number },
secondaryMotionType: { type: String }

// NEW (Simplified - fixed GPIO):
pirSensorType: { 
  type: String, 
  enum: ['hc-sr501', 'rcwl-0516', 'both'],
  default: 'hc-sr501'
},
pirSensitivity: { type: Number, default: 50 },
pirDetectionRange: { type: Number, default: 7 },
motionDetectionLogic: { 
  type: String, 
  enum: ['and', 'or', 'weighted'],
  default: 'and'
}

// GPIO pins are HARDCODED in backend logic (34 & 35)
```

**Removed fields**:
- ❌ `secondaryMotionEnabled` (not needed)
- ❌ `secondaryMotionGpio` (fixed to 35)
- ❌ `secondaryMotionType` (always 'rcwl-0516' for secondary)

---

## 🎛️ Frontend Form (Simplified)

**File**: `src/components/DeviceConfigDialog.tsx`

```typescript
// OLD Schema (Complex):
pirGpio: z.number().min(0).max(39).optional(),
secondaryMotionGpio: z.number().min(0).max(39).optional(),
secondaryMotionType: z.enum(['hc-sr501', 'rcwl-0516']).optional(),

// NEW Schema (Simplified):
pirSensorType: z.enum(['hc-sr501', 'rcwl-0516', 'both']).default('hc-sr501'),
pirSensitivity: z.number().min(0).max(100).default(50),
pirDetectionRange: z.number().min(1).max(10).default(7),
motionDetectionLogic: z.enum(['and', 'or', 'weighted']).default('and'),

// NO GPIO pin fields!
```

**UI Changes**:
- ❌ Removed: PIR GPIO dropdown
- ❌ Removed: Secondary GPIO dropdown
- ✅ Added: Fixed GPIO pin info box (read-only)
- ✅ Kept: Sensor type dropdown
- ✅ Kept: Sensitivity, range, logic controls

---

## ✅ Benefits of Fixed GPIO Configuration

### **1. Simplified Setup**:
```
Before (Complex):
1. User enables PIR sensor
2. User selects GPIO pin from dropdown (34? 35? 36?)
3. User enables secondary sensor
4. User selects secondary GPIO (must be different!)
5. Risk of selecting wrong pins
6. Risk of GPIO conflicts

After (Simplified):
1. User enables PIR sensor
2. User selects sensor type (PIR/Microwave/Both)
3. Hardware setup is always: GPIO 34 (PIR), GPIO 35 (Microwave)
4. No GPIO selection needed ✅
5. No risk of wrong pin selection ✅
6. No risk of conflicts ✅
```

### **2. Standardized Hardware**:
- All classrooms use same GPIO pins
- Technicians know: GPIO 34 = PIR, GPIO 35 = Microwave
- Simplified troubleshooting
- Easy hardware replacement (plug-and-play)

### **3. Reduced Errors**:
- Users cannot select conflicting pins
- Users cannot select output-only pins
- Users cannot select reserved pins
- Less support tickets

### **4. Cleaner UI**:
- Fewer form fields
- Less cognitive load
- Faster device setup
- Professional appearance

---

## 🚀 Migration Guide

### **For Existing Devices**:

If you have devices with custom GPIO pins configured:

1. **Check current GPIO configuration**:
   ```bash
   # In MongoDB
   db.devices.find({ pirEnabled: true }, { pirGpio: 1, secondaryMotionGpio: 1 })
   ```

2. **Update to fixed pins**:
   ```javascript
   db.devices.updateMany(
     { pirEnabled: true },
     {
       $set: { 
         pirGpio: 34,  // Force to GPIO 34
         $unset: { 
           secondaryMotionGpio: "",
           secondaryMotionType: "",
           secondaryMotionEnabled: ""
         }
       }
     }
   )
   ```

3. **Re-wire hardware**:
   - Move PIR sensor OUT pin to GPIO 34
   - Move Microwave sensor OUT pin to GPIO 35

4. **Restart ESP32**:
   - ESP32 will receive new config via MQTT
   - Verify serial output shows GPIO 34 & 35

---

## 📊 Configuration Examples

### **Example 1: Classroom with PIR Only**
```json
{
  "pirEnabled": true,
  "pirSensorType": "hc-sr501",
  "pirSensitivity": 50,
  "pirAutoOffDelay": 60
}
```
**Hardware**: Wire PIR to GPIO 34 only ✅  
**GPIO 35**: Not used

---

### **Example 2: Corridor with Microwave Only**
```json
{
  "pirEnabled": true,
  "pirSensorType": "rcwl-0516",
  "pirSensitivity": 75,
  "pirAutoOffDelay": 20
}
```
**Hardware**: Wire Microwave to GPIO 35 only ✅  
**GPIO 34**: Not used

---

### **Example 3: Lab with Dual Sensors**
```json
{
  "pirEnabled": true,
  "pirSensorType": "both",
  "pirSensitivity": 60,
  "pirAutoOffDelay": 90,
  "motionDetectionLogic": "and"
}
```
**Hardware**: Wire PIR to GPIO 34 AND Microwave to GPIO 35 ✅  
**Both pins**: Active

---

## 🎯 Quick Reference

| Sensor Mode | PIR GPIO 34 | Microwave GPIO 35 | User Config Needed |
|-------------|-------------|-------------------|-------------------|
| PIR Only | ✅ Active | ⚪ Not used | Sensitivity, delay |
| Microwave Only | ⚪ Not used | ✅ Active | Sensitivity, delay |
| Dual Mode | ✅ Active | ✅ Active | Sensitivity, delay, logic |

**Hardware Rule**: Always wire to GPIO 34 & 35 (even if only using one sensor)

---

## 🔧 Troubleshooting

### **Problem 1: "I wired PIR to GPIO 36, not working"**
**Solution**: 
- GPIO pins are FIXED to 34 (PIR) and 35 (Microwave)
- Re-wire PIR OUT pin to GPIO 34

### **Problem 2: "Can I change GPIO pins in web UI?"**
**Solution**: 
- No, GPIO pins are fixed for standardization
- Always use GPIO 34 (PIR) and GPIO 35 (Microwave)

### **Problem 3: "I have both sensors but only one works"**
**Solution**:
- Verify PIR is on GPIO 34
- Verify Microwave is on GPIO 35
- Check web UI: pirSensorType should be "both"

---

## ✅ Summary

| Aspect | Status |
|--------|--------|
| **GPIO 34 (PIR)** | ✅ FIXED - Not configurable |
| **GPIO 35 (Microwave)** | ✅ FIXED - Not configurable |
| **Sensor Type Selection** | ✅ Configurable via web UI |
| **Sensitivity** | ✅ Configurable via web UI |
| **Auto-off Delay** | ✅ Configurable via web UI |
| **Detection Logic** | ✅ Configurable via web UI |
| **Detection Range** | ✅ Configurable via web UI |
| **Pin Conflicts** | ✅ Impossible (fixed INPUT-only pins) |
| **Setup Complexity** | ✅ Greatly reduced |

---

**Generated**: October 19, 2025  
**Status**: ✅ **IMPLEMENTED & SIMPLIFIED**  
**GPIO Configuration**: **FIXED** (34 for PIR, 35 for Microwave)

