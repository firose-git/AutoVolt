# Per-Switch PIR Motion Control

## 🎯 Feature Overview

Each switch can now be **individually configured** to respond (or not respond) to motion detection! This provides maximum flexibility for classroom automation.

---

## ✨ New Features

### 1. **`usePir` - Respond to PIR Motion**
Control whether a specific switch should turn ON when motion is detected.

**Options**:
- ✅ **Enabled (`usePir = true`)**: Switch turns ON when motion detected
- ❌ **Disabled (`usePir = false`)**: Switch ignores motion sensor (default)

**Use Case**: 
- Enable for ceiling lights (turn ON with motion)
- Disable for projector (manual control only)

### 2. **`dontAutoOff` - Prevent Auto-Off**
Control whether a specific switch should turn OFF when motion stops.

**Options**:
- ✅ **Enabled (`dontAutoOff = true`)**: Switch stays ON (doesn't auto-off)
- ❌ **Disabled (`dontAutoOff = false`)**: Switch turns OFF after auto-off delay (default)

**Use Case**:
- Enable for AC/fans (should stay ON during class)
- Disable for lights (save energy when no motion)

---

## 📊 Configuration Matrix

| Switch | `usePir` | `dontAutoOff` | Motion Detected | Motion Stops (60s) | Result |
|--------|----------|---------------|-----------------|-------------------|--------|
| Light 1 | ✅ true | ❌ false | Turns ON | Turns OFF | Normal motion automation |
| Light 2 | ❌ false | ❌ false | No change | No change | Manual control only |
| AC | ✅ true | ✅ true | Turns ON | Stays ON | Turns ON with motion, never turns OFF |
| Projector | ❌ false | ✅ true | No change | No change | Manual only, never auto-off |
| Fan | ✅ true | ✅ true | Turns ON | Stays ON | Same as AC |
| Light 3 | ✅ true | ❌ false | Turns ON | Turns OFF | Normal motion automation |

---

## 🎓 Real-World Classroom Scenario

### Setup
**6 Switches in Classroom**:
1. **Ceiling Light 1** → `usePir=true`, `dontAutoOff=false`
2. **Ceiling Light 2** → `usePir=true`, `dontAutoOff=false`
3. **Projector** → `usePir=false`, `dontAutoOff=false` (manual control only)
4. **AC** → `usePir=true`, `dontAutoOff=true` (stays ON during class)
5. **Fan** → `usePir=true`, `dontAutoOff=true` (stays ON during class)
6. **Power Outlet** → `usePir=false`, `dontAutoOff=false` (manual control only)

### Workflow

#### 1. Morning - Teacher Arrives Early
```
Time: 7:00 AM
- Classroom empty, all switches OFF
- Teacher enters → Motion detected
  ✅ Ceiling Light 1 → ON (usePir=true)
  ✅ Ceiling Light 2 → ON (usePir=true)
  ❌ Projector → OFF (usePir=false, not controlled by motion)
  ✅ AC → ON (usePir=true)
  ✅ Fan → ON (usePir=true)
  ❌ Power Outlet → OFF (usePir=false)
```

#### 2. Students Arrive
```
Time: 8:00 AM
- Motion continues (students moving)
- All PIR-controlled switches stay ON
- Teacher manually turns ON projector for slideshow
```

#### 3. Short Break (Teacher Steps Out)
```
Time: 10:00 AM
- Teacher leaves for 5 minutes
- No motion for 60 seconds (auto-off delay)
  ❌ Ceiling Light 1 → OFF (usePir=true, dontAutoOff=false)
  ❌ Ceiling Light 2 → OFF (usePir=true, dontAutoOff=false)
  ✅ Projector → Stays ON (manual override active)
  ✅ AC → Stays ON (dontAutoOff=true)
  ✅ Fan → Stays ON (dontAutoOff=true)
  ❌ Power Outlet → Stays OFF (was already OFF)
```

#### 4. Teacher Returns
```
Time: 10:05 AM
- Teacher re-enters → Motion detected
  ✅ Ceiling Light 1 → ON (usePir=true)
  ✅ Ceiling Light 2 → ON (usePir=true)
  ❌ Projector → Already ON (manual override)
  ✅ AC → Already ON (dontAutoOff kept it ON)
  ✅ Fan → Already ON (dontAutoOff kept it ON)
```

#### 5. Class Ends
```
Time: 12:00 PM
- Students leave, teacher leaves
- No motion for 60 seconds
  ❌ Ceiling Light 1 → OFF (auto-off works)
  ❌ Ceiling Light 2 → OFF (auto-off works)
  ✅ Projector → Stays ON (manual override until manually turned OFF)
  ✅ AC → Stays ON (dontAutoOff=true, requires manual OFF)
  ✅ Fan → Stays ON (dontAutoOff=true, requires manual OFF)
```

**Problem**: AC and Fan stay ON all day! ❌

**Solution**: Teacher manually turns OFF AC and Fan using wall switches before leaving. Next motion will turn them back ON automatically.

---

## 🔧 How to Configure (Web UI)

### Step 1: Open Device Configuration
1. Navigate to **Devices** page
2. Click **Configure** on your ESP32 device
3. Enable **PIR Sensor** (if not already enabled)
4. Configure motion sensor settings

### Step 2: Configure Each Switch
For each switch in the device:

#### Switch 1: Ceiling Light (Normal Motion Automation)
```
Name: Ceiling Light 1
Type: Light
✅ Respond to PIR motion (usePir = true)
❌ Don't auto-off (dontAutoOff = false)
```
**Behavior**: Turns ON with motion, turns OFF after 60s no motion

#### Switch 2: AC (Stay ON During Class)
```
Name: Air Conditioner
Type: AC
✅ Respond to PIR motion (usePir = true)
✅ Don't auto-off (dontAutoOff = true)
```
**Behavior**: Turns ON with motion, stays ON until manually turned OFF

#### Switch 3: Projector (Manual Control Only)
```
Name: Projector
Type: Projector
❌ Respond to PIR motion (usePir = false)
❌ Don't auto-off (dontAutoOff = false)
```
**Behavior**: Completely manual control, motion sensor ignored

### Step 3: Save Configuration
1. Click **Save** button
2. Backend sends MQTT config to ESP32
3. ESP32 applies new settings immediately

---

## 🛠️ Technical Implementation

### Backend (server.js)
**File**: `backend/server.js` (Lines 625-630)

```javascript
switches: device.switches.map(sw => ({
  gpio: sw.relayGpio || sw.gpio,
  manualGpio: sw.manualSwitchGpio,
  manualMode: sw.manualMode || 'maintained',
  usePir: sw.usePir || false,           // ✅ Per-switch PIR control
  dontAutoOff: sw.dontAutoOff || false  // ✅ Prevent auto-off
})),
```

### ESP32 Firmware (esp32_mqtt_client.ino)

#### 1. Switch Structure (Lines 64-79)
```cpp
struct SwitchState {
  int relayGpio;
  bool state;
  bool manualOverride;
  bool usePir;         // ✅ Whether this switch responds to PIR
  bool dontAutoOff;    // ✅ Prevent auto-off for this switch
  // ... other fields
};
```

#### 2. Config Parser (Lines 589-593)
```cpp
// Parse per-switch PIR configuration
switchesLocal[i].usePir = sw["usePir"] | false;
switchesLocal[i].dontAutoOff = sw["dontAutoOff"] | false;
```

#### 3. Motion Detection - Turn ON (Lines 845-862)
```cpp
for (int i = 0; i < NUM_SWITCHES; i++) {
  // ✅ Skip if switch doesn't respond to PIR
  if (!switchesLocal[i].usePir) {
    Serial.println("[MOTION] SKIPPED - usePir=false");
    continue;
  }
  
  // Skip if manual override active
  if (switchesLocal[i].manualOverride) {
    Serial.println("[MOTION] SKIPPED - manual override");
    continue;
  }
  
  // Turn ON switch
  switchesLocal[i].state = true;
  digitalWrite(switchesLocal[i].relayGpio, HIGH);
}
```

#### 4. Auto-Off - Turn OFF (Lines 882-905)
```cpp
for (int i = 0; i < NUM_SWITCHES; i++) {
  // ✅ Skip if switch has dontAutoOff flag
  if (switchesLocal[i].dontAutoOff) {
    Serial.println("[MOTION] SKIPPED - dontAutoOff=true");
    continue;
  }
  
  // Skip if manual override active
  if (switchesLocal[i].manualOverride) {
    Serial.println("[MOTION] SKIPPED - manual override");
    continue;
  }
  
  // Turn OFF switch
  switchesLocal[i].state = false;
  digitalWrite(switchesLocal[i].relayGpio, LOW);
}
```

---

## 📊 Serial Monitor Output

### Configuration Applied
```
[CONFIG] Processing config for 6 switches
[CONFIG] Switch 0: gpio=16, usePir=1, dontAutoOff=0  (Light 1)
[CONFIG] Switch 1: gpio=17, usePir=1, dontAutoOff=0  (Light 2)
[CONFIG] Switch 2: gpio=18, usePir=0, dontAutoOff=0  (Projector)
[CONFIG] Switch 3: gpio=19, usePir=1, dontAutoOff=1  (AC)
[CONFIG] Switch 4: gpio=21, usePir=1, dontAutoOff=1  (Fan)
[CONFIG] Switch 5: gpio=22, usePir=0, dontAutoOff=0  (Outlet)
```

### Motion Detected
```
[MOTION] 🔴 Motion DETECTED - Turning ON switches (respecting manual override & usePir)
[MOTION] Switch 0 (GPIO 16) turned ON  (Light 1)
[MOTION] Switch 1 (GPIO 17) turned ON  (Light 2)
[MOTION] Switch 2 (GPIO 18) SKIPPED - usePir=false (Projector)
[MOTION] Switch 3 (GPIO 19) turned ON  (AC)
[MOTION] Switch 4 (GPIO 21) turned ON  (Fan)
[MOTION] Switch 5 (GPIO 22) SKIPPED - usePir=false (Outlet)
```

### Auto-Off Timer
```
[MOTION] ⚫ No motion for 60 seconds - Turning OFF switches (respecting manual override & dontAutoOff)
[MOTION] Switch 0 (GPIO 16) turned OFF  (Light 1)
[MOTION] Switch 1 (GPIO 17) turned OFF  (Light 2)
[MOTION] Switch 2 (GPIO 18) SKIPPED - usePir=false (Projector)
[MOTION] Switch 3 (GPIO 19) SKIPPED - dontAutoOff=true (AC stays ON)
[MOTION] Switch 4 (GPIO 21) SKIPPED - dontAutoOff=true (Fan stays ON)
[MOTION] Switch 5 (GPIO 22) SKIPPED - usePir=false (Outlet)
```

---

## 🧪 Testing Procedure

### Test 1: `usePir` Flag Works
**Setup**:
- Switch 1: `usePir=true`
- Switch 2: `usePir=false`

**Test**:
1. Wave hand in front of motion sensor
2. **Expected**: Only Switch 1 turns ON ✅
3. **Verify**: Switch 2 stays OFF ✅

### Test 2: `dontAutoOff` Flag Works
**Setup**:
- Switch 1: `usePir=true`, `dontAutoOff=false`
- Switch 2: `usePir=true`, `dontAutoOff=true`

**Test**:
1. Motion detected → Both switches turn ON ✅
2. Motion stops → Wait 60 seconds
3. **Expected**: Switch 1 turns OFF, Switch 2 stays ON ✅

### Test 3: Manual Override Still Works
**Setup**:
- Switch 1: `usePir=true`, `dontAutoOff=false`

**Test**:
1. Motion detected → Switch 1 turns ON ✅
2. Manually press Switch 1 OFF
3. Motion continues
4. **Expected**: Switch 1 stays OFF (manual override respected) ✅

### Test 4: All Flags Combined
**Setup**:
- 6 switches with different configurations (as in classroom scenario)

**Test**:
1. Motion detected → Verify correct switches turn ON
2. Motion stops → Verify correct switches turn OFF
3. Check Serial Monitor for detailed logs

---

## 🎯 Recommended Configurations

### Configuration 1: Energy Saving (Default)
All switches: `usePir=true`, `dontAutoOff=false`
- **Pros**: Maximum energy savings
- **Cons**: AC/Fan turn OFF during short breaks

### Configuration 2: Comfort Priority
- Lights: `usePir=true`, `dontAutoOff=false`
- AC/Fan: `usePir=true`, `dontAutoOff=true`
- **Pros**: Climate control stays ON
- **Cons**: Must manually turn OFF AC/Fan at end of day

### Configuration 3: Selective Automation
- Ceiling Lights: `usePir=true`, `dontAutoOff=false`
- Task Lights: `usePir=false`, `dontAutoOff=false`
- Projector: `usePir=false`, `dontAutoOff=false`
- AC/Fan: `usePir=true`, `dontAutoOff=true`
- **Pros**: Best balance between automation and control
- **Cons**: More complex configuration

---

## 🔮 Future Enhancements

### 1. Schedule-Based `dontAutoOff`
Auto-off AC/Fan at end of class schedule:
```cpp
if (currentTime >= classEndTime) {
  // Override dontAutoOff flag
  switchesLocal[i].state = false;
}
```

### 2. Grouped Switch Control
Turn ON/OFF groups of switches together:
```json
{
  "groups": [
    {"name": "All Lights", "switches": [0, 1, 2]},
    {"name": "Climate", "switches": [3, 4]}
  ]
}
```

### 3. Conditional Auto-Off
Smart logic based on time of day:
```cpp
if (hour >= 18) {
  // After 6 PM, force auto-off for AC/Fan
  dontAutoOff = false;
}
```

---

## ✅ Summary

| Feature | Status | Description |
|---------|--------|-------------|
| **`usePir`** | ✅ Implemented | Per-switch motion control (turn ON) |
| **`dontAutoOff`** | ✅ Implemented | Prevent auto-off (stay ON) |
| **Web UI** | ✅ Exists | Checkboxes for each switch |
| **Backend** | ✅ Updated | Sends config to ESP32 |
| **ESP32** | ✅ Updated | Respects per-switch flags |
| **NVS Persistence** | ✅ Implemented | Survives reboots |
| **Serial Logging** | ✅ Enhanced | Shows which switches skipped |

---

## 🎉 Result

**Complete per-switch PIR control is now available!**

Users can configure:
- ✅ Which switches respond to motion (`usePir`)
- ✅ Which switches auto-off when motion stops (`dontAutoOff`)
- ✅ Manual control always works (manual override priority)
- ✅ All settings saved to ESP32 flash memory

This provides maximum flexibility for classroom automation while maintaining user control! 🚀
