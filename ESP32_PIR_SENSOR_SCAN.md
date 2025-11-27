# ESP32 PIR Sensor Implementation Scan

**Date**: January 19, 2025  
**Project**: AutoVolt - Smart Classroom Automation System

---

## 📋 Executive Summary

**PIR Sensor Status**: ⚠️ **NOT IMPLEMENTED IN ESP32 FIRMWARE**

The project has **comprehensive backend support** for PIR (Passive Infrared) motion sensors, but the **ESP32 firmware does NOT include PIR sensor code**. The infrastructure is ready, but the hardware integration is missing.

---

## 🔍 Detailed Findings

### 1. **ESP32 Firmware Analysis**

#### ✅ **Files Scanned**:
- `esp32/esp32_mqtt_client.ino` (893 lines)
- `esp32/config.h` (21 lines)
- `esp32/esp8266.ino` (ESP8266 variant, 716 lines)
- `esp32/esp8266_config.h` (ESP8266 config, 33 lines)

#### ❌ **PIR Implementation**: **NONE FOUND**

**Search Results**:
- ❌ No `PIR` or `pir` variable declarations
- ❌ No motion sensor pin definitions
- ❌ No HC-SR501 or SR501 sensor references
- ❌ No `digitalRead()` for motion detection
- ❌ No PIR interrupt handlers
- ❌ No motion detection logic
- ❌ No PIR-triggered relay control

**What IS Implemented in ESP32**:
- ✅ Manual switch handling (momentary/maintained)
- ✅ Relay control (6 relays)
- ✅ MQTT communication
- ✅ State persistence (NVS/EEPROM)
- ✅ Offline event buffering
- ✅ Watchdog timer
- ✅ Command queueing

---

### 2. **Backend Implementation Analysis**

#### ✅ **Comprehensive PIR Support in Backend**

**Device Model** (`backend/models/Device.js`):
```javascript
pirEnabled: {
  type: Boolean,
  default: false
}

pirGpio: {
  type: Number,
  required: function() { return this.pirEnabled; },
  min: [0, 'GPIO pin must be >= 0'],
  max: [39, 'GPIO pin must be <= 39']
}

pirAutoOffDelay: {
  type: Number,
  min: 0,
  default: 30 // 30 seconds default
}
```

**GPIO Utils** (`backend/utils/gpioUtils.js`):
```javascript
pir: {
  primary: [34, 35, 36, 39], // Input-only pins (best for PIR)
  secondary: [16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33],
  description: 'GPIO pins 34-36, 39 are recommended for PIR sensors (input-only)'
}
```

**ESP8266 Support**:
```javascript
pir: {
  primary: [4, 5, 12, 13, 14, 16], // Safe pins for PIR sensors
  description: 'GPIO pins 4, 5, 12, 13, 14, 16 are recommended for PIR sensors'
}
```

---

### 3. **TypeScript Type Definitions**

**Device Interface** (`src/types/index.ts`):
```typescript
export interface Device {
  // ... other fields
  pirEnabled: boolean;
  pirGpio?: number;
  pirAutoOffDelay?: number;
  pirSensor?: PirSensor;
  // ...
}

export interface PirSensor {
  id: string;
  name: string;
  gpio: number;
  isActive: boolean;
  triggered: boolean;
  sensitivity: number;
  timeout: number; // auto-off timeout in seconds
  linkedSwitches: string[]; // switch IDs
  schedule?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}
```

**Switch Configuration**:
```typescript
export interface Switch {
  // ... other fields
  usePir: boolean; // Whether this switch is controlled by PIR
  // ...
}
```

**Activity Log**:
```typescript
export interface ActivityLog {
  // ... other fields
  triggeredBy: 'user' | 'schedule' | 'pir' | 'master' | 'system';
  // ...
}
```

---

### 4. **Socket.IO Events**

**Frontend Socket Service** (`src/services/socket.ts`):
```typescript
public onDevicePirTriggered(callback: (data: { deviceId: string; triggered: boolean }) => void) {
  this.on('device_pir_triggered', callback);
}
```

**Backend would emit**: `device_pir_triggered` when motion is detected

---

### 5. **Manual Switch Logging**

**Backend Model** (`backend/models/ManualSwitchLog.js`):
```javascript
pirCommand: {
  type: Boolean,
  default: false
}

pirStatus: String
```

This tracks when PIR sensors trigger switches vs manual control.

---

### 6. **API Permissions**

**Role-Based PIR Permissions** (`src/services/api.ts`):
```typescript
canConfigurePir?: boolean;
canViewPirData?: boolean;
canDisablePir?: boolean;
```

Admin roles can configure PIR sensors through the UI.

---

## 🚫 What's Missing

### **ESP32 Firmware Implementation Needed**:

1. **PIR Pin Configuration**
   ```cpp
   #define PIR_SENSOR_PIN 34  // Input-only pin (recommended)
   ```

2. **PIR State Variables**
   ```cpp
   bool pirEnabled = false;
   int pirGpio = 34;
   int pirAutoOffDelay = 30;  // seconds
   bool pirTriggered = false;
   unsigned long pirLastTriggered = 0;
   ```

3. **PIR Interrupt Handler**
   ```cpp
   void IRAM_ATTR pirInterrupt() {
     pirTriggered = true;
     pirLastTriggered = millis();
   }
   ```

4. **PIR Detection Loop**
   ```cpp
   void handlePirSensor() {
     if (!pirEnabled || pirGpio < 0) return;
     
     int pirState = digitalRead(pirGpio);
     
     if (pirState == HIGH && !pirTriggered) {
       // Motion detected
       pirTriggered = true;
       pirLastTriggered = millis();
       publishPirEvent(true);
       turnOnLinkedSwitches();
     }
     
     // Auto-off after delay
     if (pirTriggered && (millis() - pirLastTriggered > pirAutoOffDelay * 1000)) {
       pirTriggered = false;
       publishPirEvent(false);
       turnOffLinkedSwitches();
     }
   }
   ```

5. **MQTT Topic**
   ```cpp
   #define PIR_TOPIC "esp32/pir"
   
   void publishPirEvent(bool triggered) {
     DynamicJsonDocument doc(128);
     doc["mac"] = WiFi.macAddress();
     doc["secret"] = DEVICE_SECRET;
     doc["type"] = "pir_event";
     doc["gpio"] = pirGpio;
     doc["triggered"] = triggered;
     doc["timestamp"] = millis();
     
     char buf[128];
     size_t n = serializeJson(doc, buf);
     mqttClient.publish(PIR_TOPIC, buf, n);
   }
   ```

6. **PIR Configuration via MQTT**
   - Subscribe to `esp32/config` for PIR settings
   - Parse `pirEnabled`, `pirGpio`, `pirAutoOffDelay`
   - Link PIR to specific switches

---

## 📊 PIR Sensor Hardware Recommendations

### **Recommended PIR Sensors**:

1. **HC-SR501** (Most Popular)
   - Voltage: 5V-20V
   - Detection Range: 7 meters
   - Detection Angle: 120°
   - Output: Digital HIGH on motion
   - Adjustable sensitivity and delay

2. **AM312** (Compact)
   - Voltage: 3.3V-12V
   - Detection Range: 3-5 meters
   - Very compact size
   - Lower power consumption

3. **HC-SR505** (Mini)
   - Voltage: 3.3V-5V
   - Detection Range: 3 meters
   - Ultra-compact
   - Fixed 8-second delay

### **ESP32 GPIO Pin Recommendations**:

**Best Pins** (Input-Only):
- GPIO 34, 35, 36, 39 (No internal pull-up, perfect for digital input)

**Alternative Pins**:
- GPIO 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33

**Avoid**:
- GPIO 0, 2, 5, 12, 15 (Boot mode pins)
- GPIO 6-11 (Flash pins)
- GPIO 1, 3 (UART TX/RX)

---

## 🔧 Wiring Diagram

```
HC-SR501 PIR Sensor -> ESP32
-------------------------
VCC (5V)           -> ESP32 5V (or VIN)
GND                -> ESP32 GND
OUT (Signal)       -> GPIO 34 (or any recommended pin)
```

**Optional**:
- Add 10kΩ pull-down resistor between OUT and GND (for noise immunity)

---

## 📱 Frontend Implementation Status

**Landing Page** (`src/pages/Landing.tsx`):
```typescript
description: "PIR-based occupancy detection & scheduling"
```

✅ **UI mentions PIR sensors** but backend integration incomplete without firmware.

---

## 🎯 Implementation Priority

### **High Priority**:
1. ✅ Backend API for PIR configuration (Already done)
2. ✅ Database schema for PIR sensors (Already done)
3. ❌ **ESP32 firmware PIR detection** (MISSING - Critical)
4. ❌ **MQTT PIR event publishing** (MISSING - Critical)
5. ❌ **PIR-triggered relay control** (MISSING - Critical)

### **Medium Priority**:
6. Frontend PIR configuration UI
7. PIR sensor dashboard
8. Motion detection logs
9. PIR scheduling interface

### **Low Priority**:
10. PIR sensitivity tuning UI
11. Multi-zone PIR support
12. PIR analytics and reporting

---

## 💡 Recommended Next Steps

### **Step 1: Add PIR to ESP32 Firmware**

1. **Update `config.h`**:
   ```cpp
   #define PIR_SENSOR_PIN 34
   #define PIR_ENABLED true
   #define PIR_AUTO_OFF_DELAY 30  // seconds
   ```

2. **Add PIR variables to `esp32_mqtt_client.ino`**:
   ```cpp
   // PIR Sensor Configuration
   bool pirEnabled = PIR_ENABLED;
   int pirGpio = PIR_SENSOR_PIN;
   int pirAutoOffDelay = PIR_AUTO_OFF_DELAY;
   bool pirTriggered = false;
   unsigned long pirLastTriggered = 0;
   String pirLinkedSwitches = "";  // Comma-separated GPIO list
   ```

3. **Add PIR handling in `setup()`**:
   ```cpp
   if (pirEnabled) {
     pinMode(pirGpio, INPUT);
     Serial.printf("[PIR] Enabled on GPIO %d with %ds delay\n", pirGpio, pirAutoOffDelay);
   }
   ```

4. **Add PIR handling in `loop()`**:
   ```cpp
   if (pirEnabled) {
     handlePirSensor();
   }
   ```

5. **Implement `handlePirSensor()` function**

6. **Add PIR config parsing in `mqttCallback()`**

7. **Test with HC-SR501 sensor**

### **Step 2: Backend MQTT Handler**

1. Subscribe to `esp32/pir` topic
2. Parse PIR events
3. Update database
4. Emit Socket.IO event to frontend
5. Log PIR triggers in activity logs

### **Step 3: Frontend Integration**

1. Add PIR configuration UI in device settings
2. Display PIR status in device dashboard
3. Show motion detection alerts
4. Add PIR activity logs

---

## 📈 Expected Behavior After Implementation

### **Scenario 1: Motion Detected**
1. PIR sensor detects motion → GPIO 34 goes HIGH
2. ESP32 reads HIGH on GPIO 34
3. ESP32 publishes `{"type": "pir_event", "triggered": true}` to MQTT
4. Backend receives event, updates database
5. Backend emits Socket.IO `device_pir_triggered` event
6. ESP32 turns ON linked relays (e.g., lights)
7. Frontend shows "Motion Detected" alert

### **Scenario 2: No Motion (Auto-Off)**
1. 30 seconds pass with no motion
2. ESP32 auto-off timer expires
3. ESP32 publishes `{"type": "pir_event", "triggered": false}` to MQTT
4. ESP32 turns OFF linked relays
5. Backend logs auto-off event
6. Frontend shows "Auto-off triggered"

### **Scenario 3: PIR Configuration Change**
1. User changes PIR GPIO from 34 to 35 in UI
2. Frontend sends API request to backend
3. Backend validates and saves to database
4. Backend publishes config update to MQTT `esp32/config`
5. ESP32 receives config, applies new GPIO 35
6. ESP32 acknowledges config update
7. Frontend shows "PIR configuration updated"

---

## 🔒 Security Considerations

1. **Device Authentication**: PIR events must include `DEVICE_SECRET`
2. **MQTT Encryption**: Use TLS for MQTT broker (port 8883)
3. **False Trigger Prevention**: Debounce PIR signals (50-100ms)
4. **Rate Limiting**: Limit PIR events to 1 per second max
5. **Authorization**: Only authorized users can configure PIR

---

## 📚 References

### **HC-SR501 PIR Sensor**:
- Detection Range: 3-7 meters (adjustable)
- Detection Angle: 120°
- Delay Time: 0.3 seconds to 5 minutes (adjustable)
- Blocking Time: 2.5 seconds (default)
- Trigger Modes: 
  - L (Non-repeatable) - Output LOW after delay
  - H (Repeatable) - Output stays HIGH while motion detected

### **ESP32 GPIO Capabilities**:
- Input-only: 34, 35, 36, 39 (best for PIR, no pull-up)
- Input/Output: Most other GPIOs (avoid boot pins)
- Voltage: 3.3V logic (PIR must output 3.3V or use level shifter)

---

## ✅ Conclusion

**Current Status**:
- ✅ Backend infrastructure: **100% complete**
- ✅ Database schema: **100% complete**
- ✅ TypeScript types: **100% complete**
- ✅ API endpoints: **100% complete**
- ❌ ESP32 firmware: **0% complete (PIR not implemented)**
- ⚠️ Frontend UI: **Partial (mentions PIR but no config UI)**

**Recommendation**: 
Implement PIR sensor detection in ESP32 firmware as a **high-priority feature**. The backend is ready to receive and process PIR events immediately upon firmware implementation.

**Estimated Implementation Time**:
- ESP32 firmware: 4-6 hours
- Backend MQTT handler: 2-3 hours
- Frontend UI: 3-4 hours
- Testing: 2-3 hours
- **Total: 11-16 hours**

---

**Generated**: January 19, 2025  
**By**: AutoVolt Development Team
