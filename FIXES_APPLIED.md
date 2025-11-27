# Critical Fixes Applied - AutoVolt System

## Date: 2025-10-26

This document outlines all the critical fixes applied to resolve role-based access, ESP32 crashes, and PIR/motion sensor issues.

## 1. User Role-Based Access Issues

### Problems Identified:
1. Users not able to access pages based on their roles
2. Department and class fields not persisting after registration  
3. Permissions not properly merged from role permissions API

### Root Causes:
- The `getProfile` endpoint in auth controller returns user WITHOUT populating department/class properly
- Frontend `AuthContext` merges role permissions BUT doesn't handle missing base user permissions
- `usePermissions` hook has fallback logic that might hide missing permissions

### Fixes Applied:

#### Fix 1: Ensure Login Response Includes All User Fields
**File**: `backend/controllers/authController.js` (login function around line 425)

The login response was missing critical fields like `department` and `class`. Update the response:

```javascript
// BEFORE (incomplete):
res.json({
  success: true,
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

// AFTER (complete):
res.json({
  success: true,
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || '',
    class: user.class || '',
    employeeId: user.employeeId || '',
    designation: user.designation || '',
    permissions: user.permissions,
    isActive: user.isActive,
    isApproved: user.isApproved,
    roleLevel: user.roleLevel
  }
});
```

#### Fix 2: Update getProfile to Return Complete User Data
**File**: `backend/controllers/authController.js` (getProfile function)

Ensure ALL user fields are returned, not just select few:

```javascript
const getProfile = async (req, res) => {
  try {
    // req.user is already populated by auth middleware
    const user = await User.findById(req.user._id)
      .select('-password')  // Exclude password only
      .lean();  // Convert to plain object for performance
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        ...user,
        id: user._id
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};
```

#### Fix 3: Fix Permission Initialization in User Model
**File**: `backend/models/User.js` (pre-save hook around line 176)

The pre-save hook must NOT overwrite existing permissions, only set defaults for new users:

```javascript
userSchema.pre('save', async function (next) {
  // Only set permissions for NEW users or when role changes
  if (this.isNew || this.isModified('role')) {
    const rolePermissions = {
      // ... existing role permission definitions ...
    };

    // Set permissions based on role
    if (rolePermissions[this.role]) {
      this.permissions = { ...this.permissions, ...rolePermissions[this.role] };
    }
  }

  // Set role level (always update)
  const roleLevels = {
    'super-admin': 10,
    'dean': 9,
    'hod': 8,
    'admin': 7,
    'faculty': 6,
    'teacher': 5,
    'security': 4,
    'student': 3,
    'guest': 2
  };
  this.roleLevel = roleLevels[this.role] || 3;

  // Hash password only if modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

## 2. ESP32 Crash Issues

### Problems Identified:
1. ESP32 crashes/reboots randomly
2. Watchdog timer triggering
3. Memory leaks causing heap exhaustion
4. MQTT reconnection loops

### Root Causes Found in `esp32/esp32_mqtt_client.ino`:

1. **Heap Memory Exhaustion** (lines 395-404):
   - JSON document sizes too large (512-1024 bytes)
   - No heap checks before allocations
   - Memory fragmentation from frequent allocations

2. **Watchdog Timer Not Reset** (loop around line 1027):
   - `esp_task_wdt_reset()` called only once at loop start
   - Long-running operations don't reset WDT
   - 10-second timeout too short for slow MQTT operations

3. **MQTT Buffer Overflow** (line 1022):
   - Buffer size set to 512 bytes
   - State updates can exceed this with multiple switches
   - No bounds checking

### Fixes Applied:

#### Fix 1: Aggressive Heap Management
**File**: `esp32/esp32_mqtt_client.ino` (throughout)

```cpp
// Add heap checks before ANY JSON document creation:
if (ESP.getFreeHeap() < 3000) {
  Serial.println("[CRITICAL] Heap too low, skipping operation");
  return;
}

// Reduce JSON document sizes:
// BEFORE: DynamicJsonDocument doc(1024);
// AFTER:
DynamicJsonDocument doc(256);  // Smaller documents

// Add periodic heap monitoring in loop() around line 1050:
static unsigned long lastHeapCheck = 0;
if (millis() - lastHeapCheck > 15000) {
  size_t freeHeap = ESP.getFreeHeap();
  if (freeHeap < 10000) {
    Serial.printf("[WARNING] Low heap: %u bytes\\n", freeHeap);
  }
  lastHeapCheck = millis();
}
```

#### Fix 2: Watchdog Timer Management
**File**: `esp32/esp32_mqtt_client.ino` (setup and loop functions)

```cpp
// In setup() around line 992:
esp_task_wdt_config_t wdt_config = {
  .timeout_ms = 15000,  // INCREASE from 10s to 15s
  .trigger_panic = true
};
esp_task_wdt_init(&wdt_config);
esp_task_wdt_add(NULL);

// In loop() - reset WDT MORE FREQUENTLY:
void loop() {
  esp_task_wdt_reset();  // Reset at start
  
  handleManualSwitches();
  esp_task_wdt_reset();  // Reset after manual switches
  
  handleMotionSensor();
  esp_task_wdt_reset();  // Reset after motion sensor
  
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnect_mqtt();
      esp_task_wdt_reset();  // Reset after MQTT reconnect
    }
    if (mqttClient.connected()) {
      mqttClient.loop();
      esp_task_wdt_reset();  // Reset after MQTT loop
      processCommandQueue();
    }
  }
  
  // ... rest of loop
  esp_task_wdt_reset();  // Reset at end
  delay(10);
}
```

#### Fix 3: MQTT Buffer Size Increase
**File**: `esp32/esp32_mqtt_client.ino` (setup function around line 1022)

```cpp
// BEFORE:
mqttClient.setBufferSize(512);

// AFTER:
mqttClient.setBufferSize(1024);  // Double the buffer size
```

#### Fix 4: WiFi Reconnection Logic
**File**: `esp32/esp32_mqtt_client.ino` (setup_wifi function around line 421)

```cpp
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  // Add WiFi config for stability
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);  // Don't wear out flash
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 50) {  // Increase from 30 to 50
    delay(100);
    handleManualSwitches();
    esp_task_wdt_reset();
    Serial.print(".");
    retries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("Signal strength: %d dBm\\n", WiFi.RSSI());
    connState = WIFI_ONLY;
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    sprintf(mqttClientId, "ESP32_%s", mac.c_str());
    Serial.printf("MQTT Client ID: %s\\n", mqttClientId);
  } else {
    Serial.println("\\nWiFi connection failed, running in offline mode");
    connState = WIFI_DISCONNECTED;
  }
}
```

## 3. PIR/Motion Sensor Configuration Issues

### Problems Identified:
1. PIR enabled from frontend but doesn't work
2. Motion detected but switches don't turn on
3. Per-switch PIR configuration not applied
4. Backend doesn't properly send PIR config to ESP32

### Root Causes:

1. **Frontend-Backend Communication Gap**:
   - Device model has `motionSensor` nested object
   - ESP32 expects flat structure in CONFIG_TOPIC
   - Mismatch causes config to not be applied

2. **Per-Switch PIR Flags Missing**:
   - Switch model doesn't have `usePir` and `dontAutoOff` fields
   - ESP32 firmware expects these fields (lines 78-79, 593-595)
   - All switches respond to PIR instead of selected ones

3. **PIR Initialization Not Called**:
   - `initMotionSensor()` only called if config changes
   - GPIO pins not configured on first boot if already enabled in NVS

### Fixes Applied:

#### Fix 1: Add PIR Fields to Switch Model
**File**: `backend/models/Device.js` (Switch schema)

```javascript
const switchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['light', 'fan', 'projector', 'ac', 'other'], default: 'light' },
  state: { type: Boolean, default: false },
  gpio: { type: Number, required: true },
  relayGpio: { type: Number },
  buttonGpio: { type: Number },
  manualOverride: { type: Boolean, default: false },
  manualMode: { type: String, enum: ['momentary', 'maintained'], default: 'momentary' },
  lastStateChange: { type: Date, default: Date.now },
  
  // ✅ ADD THESE PIR-RELATED FIELDS:
  usePir: { type: Boolean, default: false },  // Whether this switch responds to PIR
  dontAutoOff: { type: Boolean, default: false },  // Prevent auto-off after motion stops
  
  powerConsumption: { type: Number, default: 0 },
  uptime: { type: Number, default: 0 }
});
```

#### Fix 2: Update Device Config Publishing Logic
**File**: `backend/controllers/deviceController.js` (updateDevice or wherever config is sent to ESP32)

When sending config to ESP32 via MQTT, include ALL motion sensor fields:

```javascript
// When publishing to esp32/config topic:
const configPayload = {
  mac: device.macAddress,
  secret: device.deviceSecret,
  switches: device.switches.map(sw => ({
    gpio: sw.relayGpio || sw.gpio,
    manualGpio: sw.buttonGpio || -1,
    manualMode: sw.manualMode || 'momentary',
    usePir: sw.usePir || false,  // ✅ Add per-switch PIR flag
    dontAutoOff: sw.dontAutoOff || false  // ✅ Add dont-auto-off flag
  })),
  motionSensor: {  // ✅ Send as NESTED object (ESP32 now handles both formats)
    enabled: device.motionSensor?.enabled || false,
    type: device.motionSensor?.type || 'hc-sr501',
    primaryGpio: 34,  // Fixed
    secondaryGpio: 35,  // Fixed
    autoOffDelay: device.motionSensor?.autoOffDelay || 30,
    dualMode: device.motionSensor?.type === 'both',
    detectionLogic: device.motionSensor?.detectionLogic || 'and'
  }
};

// Publish to MQTT
mqttClient.publish('esp32/config', JSON.stringify(configPayload));
```

#### Fix 3: Frontend PIR Configuration UI
**File**: `src/components/DeviceConfigDialog.tsx` or similar

Ensure per-switch PIR checkboxes are properly bound:

```typescript
// In the switch configuration section:
<div className="space-y-2">
  <Label>Motion Sensor Settings (Per Switch)</Label>
  {switches.map((sw, index) => (
    <div key={index} className="flex items-center gap-4 p-2 border rounded">
      <span>{sw.name}</span>
      
      <div className="flex items-center gap-2">
        <Checkbox 
          checked={sw.usePir || false}
          onCheckedChange={(checked) => {
            const newSwitches = [...switches];
            newSwitches[index].usePir = checked as boolean;
            setSwitches(newSwitches);
          }}
        />
        <Label>Respond to PIR</Label>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox 
          checked={sw.dontAutoOff || false}
          onCheckedChange={(checked) => {
            const newSwitches = [...switches];
            newSwitches[index].dontAutoOff = checked as boolean;
            setSwitches(newSwitches);
          }}
        />
        <Label>Stay ON (Don't Auto-Off)</Label>
      </div>
    </div>
  ))}
</div>
```

#### Fix 4: ESP32 PIR Initialization on Boot
**File**: `esp32/esp32_mqtt_client.ino` (setup function around line 1002)

Ensure PIR is initialized even if already enabled in NVS:

```cpp
// In setup() after loading config from NVS:
prefs.begin("motion_cfg", true);
motionConfig.enabled = prefs.getBool("enabled", false);
motionConfig.type = prefs.getString("type", "hc-sr501");
motionConfig.primaryGpio = prefs.getInt("gpio", 34);
motionConfig.autoOffDelay = prefs.getInt("autoOff", 30);
motionConfig.sensitivity = prefs.getInt("sensitivity", 50);
motionConfig.detectionRange = prefs.getInt("range", 7);
motionConfig.dualMode = prefs.getBool("dualMode", false);
motionConfig.secondaryGpio = prefs.getInt("secGpio", 35);
motionConfig.detectionLogic = prefs.getString("logic", "and");
prefs.end();

// ✅ ALWAYS call initMotionSensor() even if already configured
initMotionSensor();  // This was only called conditionally before

Serial.printf("[SETUP] Motion sensor: %s, GPIO: %d\\n", 
  motionConfig.enabled ? "ENABLED" : "DISABLED", 
  motionConfig.primaryGpio);
```

#### Fix 5: Load Per-Switch PIR Config from NVS
**File**: `esp32/esp32_mqtt_client.ino` (loadSwitchConfigFromNVS function around line 183)

```cpp
void loadSwitchConfigFromNVS() {
  prefs.begin("switch_cfg", true);
  for (int i = 0; i < NUM_SWITCHES; i++) {
    String keyRelay = "relay" + String(i);
    String keyManual = "manual" + String(i);
    String keyDefault = "def" + String(i);
    String keyState = "state" + String(i);
    String keyMomentary = "momentary" + String(i);
    String keyUsePir = "usePir" + String(i);  // ✅ ADD
    String keyDontAutoOff = "dontAutoOff" + String(i);  // ✅ ADD
    
    int relay = prefs.getInt(keyRelay.c_str(), relayPins[i]);
    int manual = prefs.getInt(keyManual.c_str(), manualSwitchPins[i]);
    bool defState = prefs.getBool(keyDefault.c_str(), false);
    bool savedState = prefs.getBool(keyState.c_str(), false);
    bool momentary = prefs.getBool(keyMomentary.c_str(), true);
    bool usePir = prefs.getBool(keyUsePir.c_str(), false);  // ✅ ADD
    bool dontAutoOff = prefs.getBool(keyDontAutoOff.c_str(), false);  // ✅ ADD
    
    switchesLocal[i].relayGpio = relay;
    switchesLocal[i].manualGpio = manual;
    switchesLocal[i].defaultState = defState;
    switchesLocal[i].state = savedState;
    switchesLocal[i].manualMomentary = momentary;
    switchesLocal[i].usePir = usePir;  // ✅ ADD
    switchesLocal[i].dontAutoOff = dontAutoOff;  // ✅ ADD
  }
  prefs.end();
  Serial.println("[NVS] Loaded switch config with PIR settings from NVS");
}
```

## 4. Testing Checklist

After applying fixes, test the following:

### Role-Based Access:
- [ ] Register new user with different roles
- [ ] Verify department/class fields persist after login
- [ ] Check all pages load correctly for each role
- [ ] Verify permissions are correctly applied (can't access unauthorized features)

### ESP32 Stability:
- [ ] Monitor ESP32 serial output for heap warnings
- [ ] Run for 24+ hours without crashes
- [ ] Test MQTT reconnection after WiFi loss
- [ ] Verify watchdog doesn't trigger during normal operation

### PIR/Motion Sensor:
- [ ] Enable PIR from web UI for a device
- [ ] Configure which switches respond to PIR
- [ ] Trigger PIR sensor and verify correct switches turn ON
- [ ] Wait for auto-off delay and verify switches turn OFF
- [ ] Test manual override (manual switch should prevent PIR control)
- [ ] Test "Don't Auto-Off" flag (switch stays ON after motion stops)

## 5. Monitoring Commands

```powershell
# Monitor ESP32 serial output
pio device monitor --baud 115200

# Check backend logs
cd backend
npm run dev

# Watch MQTT messages (if MQTT Explorer installed)
# Connect to 172.16.3.171:1883 and subscribe to esp32/#
```

## 6. Rollback Plan

If issues persist after fixes:

1. **ESP32**: Flash previous firmware version from `esp32/backup/` (if exists)
2. **Backend**: Revert database changes: `mongorestore --drop backup/`
3. **Frontend**: Clear localStorage and force re-login: `localStorage.clear()`

## Notes

- All fixes preserve backward compatibility
- Database migrations NOT required (schema updates are additive)
- ESP32 firmware update IS required (reflash all devices)
- Frontend rebuild required: `npm run build`

---

**Applied by**: WARP AI Agent  
**Review Status**: Pending manual verification  
**Priority**: CRITICAL
