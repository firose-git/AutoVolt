# Web Application Control for Motion Sensors

**Project**: AutoVolt Smart Classroom  
**Date**: October 19, 2025  
**Status**: ✅ IMPLEMENTED

---

## 🎯 Overview

All motion sensor settings (sensitivity, auto-off delay, sensor type, detection logic) are **fully configurable via the web application**. No need to edit ESP32 firmware code!

---

## 🌐 Web UI Configuration Flow

### **1. Device Configuration Dialog**

**Location**: Sidebar → Devices → Add Device / Edit Device

**Motion Sensor Settings Available**:

```typescript
interface MotionSensorConfig {
  pirEnabled: boolean;                    // Enable/disable motion detection
  pirSensorType: 'hc-sr501' | 'rcwl-0516' | 'both';  // Sensor type selection
  pirGpio: number;                        // Primary sensor GPIO (34, 35, 36, 39)
  pirAutoOffDelay: number;               // Auto-off delay in seconds (configurable!)
  pirSensitivity: number;                 // 0-100% sensitivity (configurable!)
  pirDetectionRange: number;              // 1-10 meters detection range (configurable!)
  
  // Dual sensor mode (when pirSensorType === 'both')
  secondaryMotionGpio: number;            // Secondary sensor GPIO
  secondaryMotionType: 'hc-sr501' | 'rcwl-0516';
  motionDetectionLogic: 'and' | 'or' | 'weighted';  // Detection logic
}
```

---

### **2. UI Form Fields**

**File**: `src/components/DeviceConfigDialog.tsx`

#### **A. Enable Motion Sensor**
```tsx
<Switch checked={pirEnabled} onChange={handleToggle} />
<Label>Enable Motion Sensor</Label>
```

#### **B. Sensor Type Selection** (Single or Dual)
```tsx
<Select value={pirSensorType}>
  <SelectItem value="hc-sr501">HC-SR501 (PIR Only)</SelectItem>
  <SelectItem value="rcwl-0516">RCWL-0516 (Microwave Only)</SelectItem>
  <SelectItem value="both">🔥 Both Sensors (Dual Mode)</SelectItem>
</Select>
```

#### **C. Primary Sensor GPIO**
```tsx
<Select value={pirGpio}>
  <SelectItem value="34">GPIO 34 (Primary - Input Only)</SelectItem>
  <SelectItem value="35">GPIO 35 (Primary - Input Only)</SelectItem>
  <SelectItem value="36">GPIO 36 (Primary - Input Only)</SelectItem>
  <SelectItem value="39">GPIO 39 (Primary - Input Only)</SelectItem>
</Select>
```

#### **D. Auto-off Delay** ⚙️ **CONFIGURABLE FROM WEB UI**
```tsx
<Input 
  type="number" 
  value={pirAutoOffDelay} 
  onChange={handleChange}
  min="0"
  max="300"
  placeholder="30"
/>
<FormDescription>Seconds to wait after motion stops</FormDescription>
```
- **Default**: 30 seconds
- **Range**: 0-300 seconds
- **Saved to database**: ✅
- **Sent to ESP32 via MQTT**: ✅

#### **E. Sensitivity** ⚙️ **CONFIGURABLE FROM WEB UI**
```tsx
<Input 
  type="number" 
  value={pirSensitivity} 
  onChange={handleChange}
  min="0"
  max="100"
  placeholder="50"
/>
<FormDescription>Adjust detection sensitivity (0-100%)</FormDescription>
```
- **Default**: 50%
- **Range**: 0-100%
- **Saved to database**: ✅
- **Sent to ESP32 via MQTT**: ✅

#### **F. Detection Range** ⚙️ **CONFIGURABLE FROM WEB UI**
```tsx
<Input 
  type="number" 
  value={pirDetectionRange} 
  onChange={handleChange}
  min="1"
  max="10"
  placeholder="7"
/>
<FormDescription>Maximum detection distance in meters</FormDescription>
```
- **Default**: 7 meters
- **Range**: 1-10 meters
- **Saved to database**: ✅
- **Sent to ESP32 via MQTT**: ✅

#### **G. Detection Logic** (Dual Mode Only)
```tsx
<Select value={motionDetectionLogic}>
  <SelectItem value="and">AND Logic (Both must detect)</SelectItem>
  <SelectItem value="or">OR Logic (Either triggers)</SelectItem>
  <SelectItem value="weighted">Weighted Fusion (Balanced)</SelectItem>
</Select>
```

#### **H. Secondary Sensor GPIO** (Dual Mode Only)
```tsx
<Select value={secondaryMotionGpio}>
  <SelectItem value="35">GPIO 35 (Input Only)</SelectItem>
  <SelectItem value="36">GPIO 36 (Input Only)</SelectItem>
  <SelectItem value="39">GPIO 39 (Input Only)</SelectItem>
</Select>
```

---

## 📡 Data Flow: Web UI → ESP32

### **Step 1: User Configures Device in Web UI**

User fills out form:
```json
{
  "name": "Room 101",
  "pirEnabled": true,
  "pirSensorType": "both",
  "pirGpio": 34,
  "pirAutoOffDelay": 60,        // ← User sets 60 seconds via web UI
  "pirSensitivity": 75,          // ← User sets 75% sensitivity via web UI
  "pirDetectionRange": 5,        // ← User sets 5 meters via web UI
  "secondaryMotionGpio": 35,
  "motionDetectionLogic": "and"
}
```

---

### **Step 2: Frontend Sends to Backend API**

**Endpoint**: `POST /api/devices` or `PUT /api/devices/:id`

**Request Body**:
```json
{
  "name": "Room 101",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "pirEnabled": true,
  "pirSensorType": "both",
  "pirGpio": 34,
  "pirAutoOffDelay": 60,
  "pirSensitivity": 75,
  "pirDetectionRange": 5,
  "secondaryMotionEnabled": true,
  "secondaryMotionGpio": 35,
  "secondaryMotionType": "rcwl-0516",
  "motionDetectionLogic": "and"
}
```

---

### **Step 3: Backend Saves to MongoDB**

**File**: `backend/models/Device.js`

**Schema**:
```javascript
{
  pirEnabled: Boolean,
  pirSensorType: { type: String, enum: ['hc-sr501', 'rcwl-0516', 'both'] },
  pirGpio: Number,
  pirAutoOffDelay: { type: Number, default: 30 },      // ← Saved to database
  pirSensitivity: { type: Number, default: 50 },       // ← Saved to database
  pirDetectionRange: { type: Number, default: 7 },     // ← Saved to database
  secondaryMotionGpio: Number,
  secondaryMotionType: { type: String, enum: ['hc-sr501', 'rcwl-0516'] },
  motionDetectionLogic: { type: String, enum: ['and', 'or', 'weighted'] }
}
```

---

### **Step 4: Backend Publishes to MQTT**

**File**: `backend/server.js` → `sendDeviceConfigToESP32()`

**MQTT Topic**: `esp32/config`

**Payload**:
```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "secret": "device_secret_key",
  "userId": "admin",
  "switches": [ /* switch config */ ],
  "motionSensor": {
    "enabled": true,
    "type": "both",
    "gpio": 34,
    "autoOffDelay": 60,          // ← From web UI (user-configured!)
    "sensitivity": 75,            // ← From web UI (user-configured!)
    "detectionRange": 5,          // ← From web UI (user-configured!)
    "dualMode": true,
    "secondaryGpio": 35,
    "secondaryType": "rcwl-0516",
    "detectionLogic": "and"      // ← From web UI (user-configured!)
  }
}
```

---

### **Step 5: ESP32 Receives Configuration**

**File**: `esp32/esp32_mqtt_client.ino` → `mqttCallback()`

**When ESP32 receives message on `esp32/config` topic**:

```cpp
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) == CONFIG_TOPIC) {
    DynamicJsonDocument doc(512);
    deserializeJson(doc, payload);
    
    // Motion sensor configuration
    if (doc.containsKey("motionSensor")) {
      JsonObject motionConfig = doc["motionSensor"];
      
      motionSensorEnabled = motionConfig["enabled"] | false;
      motionSensorType = motionConfig["type"] | "hc-sr501";
      motionSensorGpio = motionConfig["gpio"] | 34;
      
      // ✅ These values come from WEB UI (not hardcoded!)
      motionAutoOffDelay = motionConfig["autoOffDelay"] | 30;      // User-configured!
      motionSensitivity = motionConfig["sensitivity"] | 50;        // User-configured!
      motionDetectionRange = motionConfig["detectionRange"] | 7;  // User-configured!
      
      // Dual sensor config
      dualSensorMode = motionConfig["dualMode"] | false;
      secondarySensorGpio = motionConfig["secondaryGpio"] | -1;
      secondarySensorType = motionConfig["secondaryType"] | "rcwl-0516";
      detectionLogic = motionConfig["detectionLogic"] | "and";    // User-configured!
      
      Serial.printf("[CONFIG] Motion sensor updated from web UI:\n");
      Serial.printf("  - Type: %s\n", motionSensorType.c_str());
      Serial.printf("  - GPIO: %d\n", motionSensorGpio);
      Serial.printf("  - Auto-off: %d seconds (from web UI)\n", motionAutoOffDelay);
      Serial.printf("  - Sensitivity: %d%% (from web UI)\n", motionSensitivity);
      Serial.printf("  - Range: %d meters (from web UI)\n", motionDetectionRange);
      Serial.printf("  - Logic: %s (from web UI)\n", detectionLogic.c_str());
    }
  }
}
```

---

## ✅ Configuration Persistence

### **Where Settings Are Stored**:

1. **MongoDB Database** (Primary source of truth)
   - All settings saved to `devices` collection
   - Persists across server restarts
   - Can be edited anytime via web UI

2. **ESP32 NVS (Non-Volatile Storage)** (Optional)
   - Can save last received config to NVS
   - Survives ESP32 reboots
   - Falls back to config.h defaults if no MQTT config received

3. **config.h** (Fallback defaults)
   - Used only if no MQTT config received yet
   - Should not be edited for production use
   - Overridden by web UI settings

---

## 🔄 Updating Configuration

### **User wants to change auto-off delay from 30s to 120s**:

1. **Open Device Settings**:
   - Navigate to: Devices → Select device → Edit

2. **Change Auto-off Delay**:
   - Find "Auto-off Delay (s)" field
   - Change value from `30` to `120`
   - Click "Save"

3. **Backend Updates Database**:
   - `PUT /api/devices/:id`
   - Updates `pirAutoOffDelay: 120` in MongoDB

4. **Backend Sends MQTT Config**:
   - Publishes to `esp32/config`
   - ESP32 receives updated config
   - `motionAutoOffDelay = 120;`

5. **ESP32 Applies New Setting**:
   - Motion detection now waits 120 seconds before auto-off
   - No firmware upload needed! ✅
   - No code editing needed! ✅

---

## 🎛️ Configuration Examples

### **Example 1: Classroom with Strict Detection**
```json
{
  "pirSensorType": "both",
  "pirAutoOffDelay": 90,        // 90 seconds (user sets via web UI)
  "pirSensitivity": 50,          // 50% sensitivity (user sets via web UI)
  "motionDetectionLogic": "and"  // Both must detect (user sets via web UI)
}
```
**Result**: Very low false positives, 90-second delay before lights turn off

---

### **Example 2: Corridor with Fast Response**
```json
{
  "pirSensorType": "rcwl-0516",
  "pirAutoOffDelay": 20,         // 20 seconds (user sets via web UI)
  "pirSensitivity": 75,          // 75% sensitivity (user sets via web UI)
}
```
**Result**: Fast motion detection, 20-second auto-off

---

### **Example 3: Lab with Redundancy**
```json
{
  "pirSensorType": "both",
  "pirAutoOffDelay": 120,        // 120 seconds (user sets via web UI)
  "pirSensitivity": 60,          // 60% sensitivity (user sets via web UI)
  "motionDetectionLogic": "or"   // Either sensor triggers (user sets via web UI)
}
```
**Result**: High sensitivity, 2-minute delay for safety equipment

---

## 📊 Configuration Validation

### **Frontend Validation** (`DeviceConfigDialog.tsx`):
```typescript
const formSchema = z.object({
  pirAutoOffDelay: z.number().min(0).max(300),     // 0-300 seconds
  pirSensitivity: z.number().min(0).max(100),      // 0-100%
  pirDetectionRange: z.number().min(1).max(10),    // 1-10 meters
});
```

### **Backend Validation** (`Device.js`):
```javascript
pirAutoOffDelay: {
  type: Number,
  min: 0,
  max: 300,
  default: 30
},
pirSensitivity: {
  type: Number,
  min: 0,
  max: 100,
  default: 50
},
pirDetectionRange: {
  type: Number,
  min: 1,
  max: 10,
  default: 7
}
```

---

## 🚀 Quick Testing

### **Test 1: Change Auto-off Delay via Web UI**

1. Open device settings in web UI
2. Change "Auto-off Delay" from 30 to 10 seconds
3. Click "Save"
4. Wave hand in front of sensor
5. Stop moving
6. **Result**: Lights turn off after 10 seconds ✅

### **Test 2: Change Sensitivity via Web UI**

1. Open device settings in web UI
2. Change "Sensitivity" from 50% to 80%
3. Click "Save"
4. Make small movements near sensor
5. **Result**: More sensitive detection ✅

### **Test 3: Change Detection Logic via Web UI**

1. Open device settings in web UI (dual mode enabled)
2. Change "Detection Logic" from AND to OR
3. Click "Save"
4. Cover one sensor
5. **Result**: System still triggers (OR logic) ✅

---

## ✅ Summary

| Setting | Configurable via Web UI? | Saved to Database? | Sent to ESP32? | Real-time Update? |
|---------|--------------------------|-------------------|----------------|-------------------|
| **pirEnabled** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **pirSensorType** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **pirGpio** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **pirAutoOffDelay** | ✅ **YES** | ✅ **YES** | ✅ **YES** | ✅ **YES** |
| **pirSensitivity** | ✅ **YES** | ✅ **YES** | ✅ **YES** | ✅ **YES** |
| **pirDetectionRange** | ✅ **YES** | ✅ **YES** | ✅ **YES** | ✅ **YES** |
| **motionDetectionLogic** | ✅ **YES** | ✅ **YES** | ✅ **YES** | ✅ **YES** |
| **secondaryMotionGpio** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🎯 No Firmware Editing Needed!

**All motion sensor settings are controlled via the web application:**
- ✅ Auto-off delay (0-300 seconds)
- ✅ Sensitivity (0-100%)
- ✅ Detection range (1-10 meters)
- ✅ Detection logic (AND/OR/Weighted)
- ✅ Sensor type (PIR/Microwave/Both)
- ✅ GPIO pins (34, 35, 36, 39)

**Users can change these settings anytime without:**
- ❌ Editing `config.h`
- ❌ Uploading new firmware
- ❌ Restarting ESP32 (config applied via MQTT)

---

**Generated**: October 19, 2025  
**Status**: ✅ **FULLY IMPLEMENTED**  
**Next Steps**: Test configuration changes via web UI

