# Manual Switch vs Motion Sensor Priority

## 🎯 Priority System Overview

The ESP32 firmware implements a **Manual Override Priority** system where **manual switches always take precedence** over motion sensor automation.

---

## 🔑 Key Principle

**Manual control = User intent → Always respected**

When a user manually presses a physical switch, it indicates **explicit user intent** which should override any automatic behavior.

---

## 📊 Behavior Matrix

| Scenario | Motion Sensor Action | Manual Switch Action | Result | Reason |
|----------|---------------------|---------------------|--------|--------|
| Motion detected, all switches OFF | Motion → Turn ON all | None | ✅ All switches ON | Normal automation |
| Motion detected, Switch 1 manually ON | Motion → Turn ON all | Switch 1 already ON | ✅ All switches ON | Motion respects existing state |
| Motion detected, Switch 1 manually OFF | Motion → Try to turn ON all | Switch 1 has manual override | ⚠️ All switches ON **except Switch 1** | Manual override respected |
| Motion stops (auto-off timer), all motion-controlled | Motion → Turn OFF all | None | ✅ All switches OFF | Normal automation |
| Motion stops (auto-off timer), Switch 1 manually ON | Motion → Try to turn OFF all | Switch 1 has manual override | ⚠️ All switches OFF **except Switch 1** | Manual override preserved |
| Motion active, user presses Switch 1 OFF | Motion → Keep ON | User → Turn OFF | ✅ Switch 1 OFF, others ON | Manual command takes priority |
| No motion, user presses Switch 1 ON | None | User → Turn ON | ✅ Switch 1 ON | Manual control works independently |

---

## 🔧 How It Works (Technical)

### 1. **Manual Override Flag**
Each switch has a `manualOverride` boolean flag:
```cpp
struct SwitchState {
  bool state;              // Current ON/OFF state
  bool manualOverride;     // TRUE if manually controlled
  // ... other fields
};
```

### 2. **Manual Switch Detection**
When a physical switch is pressed:
```cpp
void handleManualSwitches() {
  // ... debouncing and detection logic
  
  if (switchPressed) {
    sw.state = !sw.state;  // Toggle state
    sw.manualOverride = true;  // ✅ SET MANUAL OVERRIDE FLAG
    digitalWrite(sw.relayGpio, sw.state ? HIGH : LOW);
    publishManualSwitchEvent(sw.relayGpio, sw.state);
  }
}
```

### 3. **Motion Sensor Respects Manual Override**

#### When Motion Detected (Turn ON switches):
```cpp
void handleMotionSensor() {
  if (motionDetected) {
    for (int i = 0; i < NUM_SWITCHES; i++) {
      // ✅ CHECK MANUAL OVERRIDE - SKIP IF TRUE
      if (switchesLocal[i].manualOverride) {
        Serial.println("[MOTION] SKIPPED - manual override active");
        continue;  // Don't change this switch!
      }
      
      // Only turn ON switches that don't have manual override
      switchesLocal[i].state = true;
      digitalWrite(switchesLocal[i].relayGpio, HIGH);
    }
  }
}
```

#### When Motion Stops (Auto-off timer):
```cpp
void handleMotionSensor() {
  if (autoOffTimer) {
    for (int i = 0; i < NUM_SWITCHES; i++) {
      // ✅ CHECK MANUAL OVERRIDE - SKIP IF TRUE
      if (switchesLocal[i].manualOverride) {
        Serial.println("[MOTION] SKIPPED - manual override active, keeping state");
        continue;  // Don't turn OFF this switch!
      }
      
      // Only turn OFF switches that don't have manual override
      switchesLocal[i].state = false;
      digitalWrite(switchesLocal[i].relayGpio, LOW);
    }
  }
}
```

---

## 📖 Real-World Scenarios

### Scenario 1: Normal Classroom Operation
```
1. Classroom empty, all lights OFF
2. Teacher enters → Motion detected → All lights ON ✅
3. Teacher teaching (motion active) → Lights stay ON ✅
4. Class ends, teacher leaves → No motion for 60s → All lights OFF ✅
```

### Scenario 2: Teacher Wants Specific Light OFF During Class
```
1. Classroom empty, all lights OFF
2. Students enter → Motion detected → All 6 lights ON ✅
3. Teacher presents slideshow → Needs projector light OFF
4. Teacher manually presses Switch 3 OFF
   → Switch 3 turns OFF, manual override flag SET ✅
   → Other 5 lights remain ON ✅
5. Motion continues (students moving) → Motion system tries to turn ON all
   → Checks manual override for Switch 3 → SKIPPED ✅
   → Switch 3 stays OFF (manual control respected) ✅
6. Class ends, students leave → No motion for 60s
   → Auto-off tries to turn OFF all lights
   → Checks manual override for Switch 3 → SKIPPED ✅
   → Switches 1,2,4,5,6 turn OFF
   → Switch 3 stays OFF (was already OFF) ✅
```

### Scenario 3: Teacher Arrives Early, Manually Turns ON Light
```
1. Classroom empty, all lights OFF
2. Teacher arrives 30 mins before class (early morning)
3. Teacher manually presses Switch 1 ON
   → Switch 1 turns ON, manual override flag SET ✅
4. Teacher works quietly at desk (minimal motion)
5. Motion sensor doesn't detect continuous motion
6. Auto-off timer expires (60s no motion)
   → Motion system tries to turn OFF all lights
   → Checks manual override for Switch 1 → SKIPPED ✅
   → Switch 1 stays ON (manual control preserved) ✅
   → Other switches remain OFF
7. Students arrive → Motion detected → Switches 2-6 turn ON ✅
   → Switch 1 already ON (manual override still active) ✅
```

### Scenario 4: Emergency Situation
```
1. Class in progress, all lights ON (motion-controlled)
2. Fire alarm / Emergency drill
3. Teacher manually turns OFF all switches at wall panel
   → All switches turn OFF, manual override flags SET ✅
4. Motion continues (students evacuating)
   → Motion system tries to turn ON lights
   → ALL switches have manual override → ALL SKIPPED ✅
   → Lights stay OFF (safety priority respected) ✅
```

---

## 🔄 Clearing Manual Override

### When is Manual Override Cleared?

**Option 1: Backend Command (Recommended)**
Backend can send an MQTT command to clear manual override:
```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "gpio": 16,
  "state": true,
  "clearOverride": true
}
```

**Option 2: Auto-Clear on State Change**
If user manually presses the switch again to change state, the override remains active (user is still controlling it manually).

**Option 3: System Reset/Reboot**
Manual override flags are stored in memory, cleared on ESP32 reboot (optional: can be persisted to NVS if desired).

### Current Implementation
Manual override flags are **memory-only** (not persisted to NVS):
- ✅ Survives motion detection cycles
- ✅ Survives WiFi disconnection
- ❌ Cleared on ESP32 reboot
- ❌ Not synchronized across multiple ESP32 devices

---

## 🛡️ Why This Design?

### 1. **Safety First**
Manual switch = physical access = authorized personnel
- Teacher needs emergency control
- Fire safety requirements
- Maintenance access

### 2. **User Autonomy**
Users should always have control over their environment
- Motion sensors are helpful but not mandatory
- User preferences override automation
- No "fighting" between manual and automatic control

### 3. **Predictable Behavior**
Clear priority system prevents confusion:
- Manual always wins
- No unexpected state changes
- Easy to troubleshoot

### 4. **Energy Efficiency with Control**
Balance between automation and user choice:
- Motion sensor saves energy automatically
- But doesn't force users into discomfort
- Best of both worlds

---

## 📊 Serial Monitor Examples

### Motion Detection with Manual Override
```
[MOTION] 🔴 Motion DETECTED - Turning ON switches (respecting manual override)
[MOTION] Switch 0 (GPIO 16) turned ON
[MOTION] Switch 1 (GPIO 17) turned ON
[MOTION] Switch 2 (GPIO 18) SKIPPED - manual override active
[MOTION] Switch 3 (GPIO 19) turned ON
[MOTION] Switch 4 (GPIO 21) turned ON
[MOTION] Switch 5 (GPIO 22) turned ON
[MOTION] Published motion event: DETECTED
```

### Auto-Off with Manual Override
```
[MOTION] ⚫ No motion for 60 seconds - Turning OFF switches (respecting manual override)
[MOTION] Switch 0 (GPIO 16) turned OFF
[MOTION] Switch 1 (GPIO 17) turned OFF
[MOTION] Switch 2 (GPIO 18) SKIPPED - manual override active, keeping state
[MOTION] Switch 3 (GPIO 19) turned OFF
[MOTION] Switch 4 (GPIO 21) turned OFF
[MOTION] Switch 5 (GPIO 22) turned OFF
[MOTION] Published motion event: STOPPED
```

### Manual Switch Pressed During Motion
```
[MANUAL] Momentary PRESS: Relay GPIO 18 toggled to OFF
[MQTT] Published manual switch event: GPIO 18 (physical pin 27) -> OFF
[MOTION] Motion continues (user manually turned off light)
[MOTION] Switch 2 (GPIO 18) SKIPPED - manual override active
```

---

## 🧪 Testing Procedure

### Test 1: Motion Detection Works Normally
1. **Setup**: All switches OFF, no manual override
2. **Action**: Wave hand in front of motion sensor
3. **Expected**: All lights turn ON ✅
4. **Verify**: Serial monitor shows all switches turned ON

### Test 2: Manual Override During Motion
1. **Setup**: Motion active, all lights ON
2. **Action**: Manually press Switch 3 OFF
3. **Expected**: Switch 3 turns OFF, others stay ON ✅
4. **Verify**: Serial monitor shows "manual override active"
5. **Continue**: Motion continues
6. **Expected**: Switch 3 stays OFF (not re-enabled by motion) ✅

### Test 3: Auto-Off Respects Manual Override
1. **Setup**: Motion detected, all lights ON, Switch 3 manually OFF
2. **Action**: Stop motion, wait 60 seconds (auto-off delay)
3. **Expected**: Switches 1,2,4,5,6 turn OFF, Switch 3 stays OFF ✅
4. **Verify**: Serial monitor shows Switch 3 skipped during auto-off

### Test 4: Manual Control Without Motion
1. **Setup**: No motion, all lights OFF
2. **Action**: Manually press Switch 1 ON
3. **Expected**: Switch 1 turns ON ✅
4. **Action**: Wait 60 seconds (no motion)
5. **Expected**: Switch 1 stays ON (manual override preserved) ✅

### Test 5: Backend Command Overrides Manual
1. **Setup**: Switch 3 manually OFF (manual override active)
2. **Action**: Send backend MQTT command to turn Switch 3 ON
3. **Expected**: Switch 3 turns ON (backend command processed) ✅
4. **Verify**: Manual override flag cleared (optional implementation)

---

## 🔮 Future Enhancements

### 1. **Configurable Override Duration**
Auto-clear manual override after X minutes:
```cpp
struct SwitchState {
  bool manualOverride;
  unsigned long manualOverrideTime;  // Timestamp when override set
  int manualOverrideDuration;        // Minutes to keep override (0 = forever)
};
```

### 2. **Per-Switch Motion Control**
Allow configuring which switches are controlled by motion:
```json
{
  "switches": [
    {"gpio": 16, "motionControlled": true},
    {"gpio": 17, "motionControlled": true},
    {"gpio": 18, "motionControlled": false},  // Never controlled by motion
  ]
}
```

### 3. **Manual Override Persistence**
Save manual override flags to NVS:
- Survives reboots
- Can be synchronized to backend database
- Provides audit trail

### 4. **Smart Override Logic**
- Auto-clear override when motion stops
- Different behavior for different times of day
- Integration with schedule system

---

## ✅ Summary

| Feature | Status | Behavior |
|---------|--------|----------|
| **Manual Switch Priority** | ✅ Implemented | Manual always wins over motion |
| **Motion Detection** | ✅ Implemented | Respects manual override flag |
| **Auto-Off Timer** | ✅ Implemented | Skips manually-controlled switches |
| **Override Flag** | ✅ Implemented | Set on manual press, checked by motion |
| **Serial Logging** | ✅ Implemented | Clear messages about skipped switches |
| **Safety** | ✅ Guaranteed | User always has physical control |

---

## 🎓 Key Takeaways

1. **Manual switches set `manualOverride = true`** when pressed
2. **Motion detection checks `manualOverride`** before changing switch state
3. **Auto-off timer respects `manualOverride`** and skips those switches
4. **Backend commands can override manual** (optional implementation)
5. **Manual override survives motion cycles** but not reboots (current design)

This design ensures **user autonomy, safety, and predictable behavior** while providing convenient automation! 🚀
