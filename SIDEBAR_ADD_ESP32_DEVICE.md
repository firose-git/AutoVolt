# Adding ESP32 Devices - Sidebar Menu Guide

**Date**: January 19, 2025  
**Project**: AutoVolt - Smart Classroom Automation System

---

## 📋 Executive Summary

This document explains how ESP32 devices are added through the sidebar menu in the AutoVolt system, including the complete workflow, UI components, and backend integration.

---

## 🗂️ Sidebar Menu Structure

### **Current Navigation Layout**

The sidebar is organized into **7 sections**:

1. **Dashboard** - Power Dashboard (main overview)
2. **Core Operations** - Devices, Switches, Master Control
3. **Scheduling** - Schedule management
4. **User Management** - Users, Roles, Permissions
5. **Analytics & Monitoring** - System Health, Analytics, AI/ML, Grafana, Prometheus
6. **Support & Logs** - Support Tickets, Active Logs
7. **Account & Settings** - Profile, Settings

---

## 🎯 Device Management Location

### **"Devices" Menu Item**

**Location**: `Core Operations` → `Devices`

**Details**:
```typescript
{
  title: 'Core Operations',
  items: [
    { 
      name: 'Devices', 
      icon: Cpu, 
      href: '/dashboard/devices', 
      requiresPermission: 'canManageDevices' 
    },
    // ... other items
  ]
}
```

**Access Requirements**:
- ✅ User must be authenticated
- ✅ User must have `canManageDevices` permission
- ✅ Typically: Admin or Super Admin role

**File**: `src/components/Sidebar.tsx` (Line 43-48)

---

## 📱 Adding ESP32 Device Workflow

### **Step 1: Navigate to Devices Page**

**User Action**: Click "Devices" in sidebar

**What Happens**:
1. Sidebar component calls `handleNavigation('/dashboard/devices')`
2. System checks if route is device-related
3. Triggers background device refresh (`refreshDevices({ background: true })`)
4. Shows global loading indicator
5. Navigates to Devices page

**Code** (`Sidebar.tsx` Line 116-133):
```typescript
const handleNavigation = (href: string, isExternal?: boolean) => {
  if (navLock) return;
  setNavLock(true);
  
  // Device-related routes trigger background refresh
  if (deviceRelated.has(href)) {
    const token = start('nav');
    refreshDevices({ background: true }).finally(() => stop(token));
  }
  
  navigate(href);
  if (onNavigateClose) onNavigateClose();
};
```

---

### **Step 2: Devices Page Interface**

**Page**: `src/pages/Devices.tsx`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Devices                    [Live] 🟢    │
│ Last updated: 10:30:45 AM              │
├─────────────────────────────────────────┤
│ Statistics Dashboard                    │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐│
│ │Total  │ │Online │ │Offline│ │Active││
│ │   5   │ │   3   │ │   2   │ │   12 ││
│ └───────┘ └───────┘ └───────┘ └───────┘│
├─────────────────────────────────────────┤
│ Search & Filters                        │
│ [Search...] [Type▼] [Location▼] [⟳]   │
├─────────────────────────────────────────┤
│ Device List                             │
│ ┌─────────────────────────────────────┐│
│ │ 📟 ESP32 - Room 101  [Edit] [Delete]││
│ │    Status: Online | 6 switches      ││
│ └─────────────────────────────────────┘│
│                                         │
│              [+ Add Device]  ← BUTTON   │
└─────────────────────────────────────────┘
```

**Key Features**:
- Real-time connection status (Live/Connecting/Offline)
- Device statistics (Total, Online, Offline, Active switches)
- Search and filter functionality
- Device cards with edit/delete actions
- **Fixed "Add Device" button** (bottom-right corner)

---

### **Step 3: "Add Device" Button**

**Location**: Fixed at bottom-right of screen

**Visibility**:
- ✅ Only shown to **Admin users**
- ✅ Hidden when config dialog is already open
- ✅ Hidden during device editing

**Code** (`Devices.tsx` Line 551-567):
```tsx
{isAdmin && !(showConfigDialog && !selectedDevice) && !selectedDevice && (
  <div className="fixed bottom-6 right-6 z-50">
    <Button
      size="lg"
      variant="default"
      onClick={() => {
        setSelectedDevice(undefined);
        setShowConfigDialog(true);
      }}
      className="shadow-lg hover:shadow-xl transition-shadow"
    >
      <Plus className="w-5 h-5 mr-2" />
      Add Device
    </Button>
  </div>
)}
```

**Button Properties**:
- Size: Large
- Style: Primary (blue)
- Icon: Plus (+)
- Shadow: Large with hover effect
- Z-index: 50 (always on top)

---

### **Step 4: Device Configuration Dialog**

**Component**: `DeviceConfigDialog.tsx` (1239 lines)

**Opens When**: User clicks "Add Device" button

**Dialog Structure**:
```
┌─────────────────────────────────────────────────────┐
│ Add New Device                             [✕ Close] │
├─────────────────────────────────────────────────────┤
│                                                       │
│ BASIC INFORMATION                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Device Name: [_________________________]        │ │
│ │ MAC Address: [XX:XX:XX:XX:XX:XX]                │ │
│ │ IP Address:  [192.168.1.___]                    │ │
│ │ Device Type: [ESP32 ▼]  (ESP32 or ESP8266)     │ │
│ │ Location:    [Block: A ▼] [Floor: 1 ▼]         │ │
│ │ Classroom:   [Room 101]                         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ PIR SENSOR CONFIGURATION                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [✓] Enable PIR Sensor                           │ │
│ │ GPIO Pin:        [34 ▼]                         │ │
│ │ Auto-off Delay:  [30] seconds                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ SWITCH CONFIGURATION (1/8)                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Switch 1                                        │ │
│ │ Name:         [Light 1]                         │ │
│ │ Relay GPIO:   [16 ▼]                            │ │
│ │ Type:         [Light ▼]                         │ │
│ │                                                  │ │
│ │ [✓] Enable Manual Switch                        │ │
│ │ Manual GPIO:  [25 ▼]                            │ │
│ │ Mode:         [Momentary ▼] (or Maintained)    │ │
│ │                                                  │ │
│ │ [✓] Use PIR Sensor                              │ │
│ │ [ ] Don't Auto-off                              │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [+ Add Switch] (up to 8 for ESP32, 4 for ESP8266)   │
│                                                       │
│ DEVICE SECRET KEY                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔒 Auto-generated on save                        │ │
│ │ [Show Secret] (after device creation)            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│                  [Cancel]  [Add Device]              │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Device Configuration Fields

### **1. Basic Information**

| Field | Required | Format | Validation |
|-------|----------|--------|------------|
| **Device Name** | ✅ Yes | String | Min 1 character |
| **MAC Address** | ✅ Yes | `XX:XX:XX:XX:XX:XX` | Regex validation, unique |
| **IP Address** | ✅ Yes | `192.168.1.100` | Valid IPv4, octets 0-255 |
| **Device Type** | ✅ Yes | `esp32` or `esp8266` | Dropdown selection |
| **Location** | ✅ Yes | `Block A Floor 1` | Block A-D, Floor 0-5 |
| **Classroom** | ⚠️ Optional | String | Room identifier |

**Form Schema** (`DeviceConfigDialog.tsx` Line 87-98):
```typescript
const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  macAddress: z.string()
    .min(1, 'MAC address is required')
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC'),
  ipAddress: z.string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IP')
    .refine(v => v.split('.').every(o => +o >= 0 && +o <= 255), 'Octets 0-255'),
  location: z.string().min(1),
  classroom: z.string().optional(),
  deviceType: z.enum(['esp32', 'esp8266']).default('esp32'),
  // ... more fields
});
```

---

### **2. PIR Sensor Configuration**

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| **PIR Enabled** | No | `false` | Toggle checkbox |
| **PIR GPIO** | If enabled | - | ESP32: 34-39 (input-only), ESP8266: 4-16 |
| **Auto-off Delay** | If enabled | `30` sec | Timeout after no motion |

**Recommended GPIO Pins**:
- **ESP32**: GPIO 34, 35, 36, 39 (input-only, best for PIR)
- **ESP8266**: GPIO 4, 5, 12, 13, 14, 16

**Schema** (`DeviceConfigDialog.tsx` Line 99-101):
```typescript
pirEnabled: z.boolean().default(false),
pirGpio: z.number().min(0).max(39).optional(),
pirAutoOffDelay: z.number().min(0).default(30),
```

---

### **3. Switch Configuration**

**Limits**:
- **ESP32**: Up to 8 switches
- **ESP8266**: Up to 4 switches

**Per-Switch Fields**:

| Field | Required | Options | Notes |
|-------|----------|---------|-------|
| **Name** | ✅ Yes | String | "Light 1", "Fan", etc. |
| **Relay GPIO** | ✅ Yes | 0-39 | Output pin for relay |
| **Type** | ✅ Yes | relay, light, fan, outlet, projector, ac | Visual icon |
| **Manual Switch Enabled** | No | Boolean | Enable physical button |
| **Manual GPIO** | If manual enabled | 0-39 | Input pin for button |
| **Manual Mode** | If manual enabled | momentary, maintained | Button type |
| **Manual Active Low** | If manual enabled | true/false | Pull-up resistor |
| **Use PIR** | No | Boolean | Link to PIR sensor |
| **Don't Auto-off** | No | Boolean | Keep on even if inactive |

**Switch Schema** (`DeviceConfigDialog.tsx` Line 44-64):
```typescript
const switchSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  gpio: z.number().min(0).max(39).optional(),
  relayGpio: z.number().min(0).max(39).optional(),
  type: z.enum(['relay', 'light', 'fan', 'outlet', 'projector', 'ac']),
  icon: z.string().optional(),
  state: z.boolean().default(false),
  manualSwitchEnabled: z.boolean().default(false),
  manualSwitchGpio: z.number().min(0).max(39).optional(),
  manualMode: z.enum(['maintained', 'momentary']).default('maintained'),
  manualActiveLow: z.boolean().default(true),
  usePir: z.boolean().default(false),
  dontAutoOff: z.boolean().default(false)
});
```

---

### **4. GPIO Pin Validation**

**Validation Features**:
- ✅ Unique GPIO pins across all switches
- ✅ No conflicts between relay and manual GPIOs
- ✅ Device-specific pin recommendations
- ✅ Boot mode pin warnings (ESP8266: GPIO 0, 2, 15)
- ✅ Flash pin blocking (GPIO 6-11)
- ✅ Input-only pin detection (ESP32: GPIO 34-39)

**GPIO Validation** (`DeviceConfigDialog.tsx` Line 31-40):
```typescript
interface GpioPinInfo {
  pin: number;
  safe: boolean;
  status: 'safe' | 'problematic' | 'reserved' | 'invalid';
  reason: string;
  used: boolean;
  available: boolean;
  category: string;
  inputOnly?: boolean;
  recommendedFor?: string[];
  alternativePins?: number[];
}
```

**ESP32 GPIO Categories**:
- ✅ **Safe**: 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33
- ⚠️ **Problematic**: 0, 2, 5, 12, 15 (boot mode)
- ❌ **Reserved**: 1, 3 (UART TX/RX), 6-11 (Flash)
- 🔒 **Input-only**: 34, 35, 36, 39 (perfect for PIR)

**ESP8266 GPIO Categories**:
- ✅ **Safe**: 4 (D2), 5 (D1), 12 (D6), 13 (D7), 14 (D5)
- ⚠️ **Problematic**: 0 (D3), 2 (D4), 15 (D8) (boot mode)
- ❌ **Reserved**: 1 (TX), 3 (RX), 6-11 (Flash)

---

## 💾 Device Addition Process

### **Step 5: Form Submission**

**User Action**: Click "Add Device" button in dialog

**What Happens** (`Devices.tsx` Line 262-289):

1. **Validation**: Zod schema validates all fields
2. **Data Formatting**:
   ```typescript
   {
     ...data,
     id: `device-${Date.now()}`,
     status: 'offline',
     lastSeen: new Date(),
     switches: data.switches.map((sw, idx) => ({
       id: `switch-${Date.now()}-${idx}`,
       name: sw.name || 'Unnamed Switch',
       type: sw.type || 'relay',
       gpio: sw.gpio,
       relayGpio: sw.relayGpio,
       state: false,
       manualSwitchEnabled: sw.manualSwitchEnabled || false,
       // ... more fields
     }))
   }
   ```

3. **API Call**: `addDevice(deviceData)`
   - Endpoint: `POST /api/devices`
   - Includes all device configuration
   - Backend generates device secret

4. **Device Secret Display**:
   ```typescript
   if (result.deviceSecret) {
     toast({
       title: "Device Secret Key",
       description: `Secret: ${result.deviceSecret}`,
       duration: 10000, // 10 seconds
     });
     console.log('Device Secret Key:', result.deviceSecret);
   }
   ```

5. **Success Feedback**:
   - Toast notification: "Device added successfully"
   - Device secret key displayed (10 seconds)
   - Secret logged to console for copying
   - Dialog closes
   - Device list refreshes

6. **Error Handling**:
   - Shows error toast if API call fails
   - Dialog remains open for corrections
   - Error message from backend displayed

---

### **Step 6: Backend Processing**

**API Endpoint**: `POST /api/devices`

**Backend Flow** (`backend/controllers/deviceController.js`):

1. **Authentication Check**: Verify JWT token
2. **Permission Check**: Ensure user has `canManageDevices`
3. **Data Validation**:
   - MAC address format and uniqueness
   - IP address format and uniqueness
   - GPIO pin conflicts
   - Device type validation
4. **Device Secret Generation**:
   ```javascript
   const deviceSecret = crypto.randomBytes(24).toString('hex');
   // 48-character hex string
   ```
5. **Database Save**:
   - Create device document in MongoDB
   - Store encrypted device secret
   - Create switch sub-documents
   - Set initial status to "offline"
6. **Response**:
   ```json
   {
     "success": true,
     "device": { /* device data */ },
     "deviceSecret": "7a9aa8ccac979310a8ace9b4a1beedf78439af3ea91ccd5f"
   }
   ```

---

### **Step 7: ESP32 Configuration**

**User Action**: Configure ESP32 firmware with device details

**Required Information**:
- Device Secret (from Step 6)
- MAC Address
- WiFi SSID
- WiFi Password
- MQTT Broker IP

**ESP32 Config File** (`esp32/config.h`):
```cpp
#define WIFI_SSID "AIMS-WIFI"
#define WIFI_PASSWORD "Aimswifi#2025"
#define DEVICE_SECRET "7a9aa8ccac979310a8ace9b4a1beedf78439af3ea91ccd5f"
#define MQTT_BROKER "172.16.3.171"
#define MQTT_PORT 1883

int relayPins[6] = {16, 17, 18, 19, 21, 22};
int manualSwitchPins[6] = {25, 26, 27, 32, 33, 23};
```

**Upload Firmware**:
1. Update `config.h` with device secret
2. Verify pin configuration matches web UI
3. Compile and upload to ESP32
4. Device will connect and appear "online" in dashboard

---

## 🔄 Real-Time Updates

### **Socket.IO Integration**

**Events Listened**:
- `device_connected` - Device comes online
- `device_disconnected` - Device goes offline
- `device_state_update` - Switch states change
- `device_pir_triggered` - PIR sensor detects motion

**Frontend Handler** (`Devices.tsx` Line 60-120):
```typescript
useEffect(() => {
  if (!isAuthenticated) return;

  // Device connected
  socketService.onDeviceConnected((data) => {
    console.log('Device connected:', data);
    refreshDevices({ background: true });
  });

  // Device disconnected
  socketService.onDeviceDisconnected((data) => {
    console.log('Device disconnected:', data);
    refreshDevices({ background: true });
  });

  // State update
  socketService.onDeviceStateUpdate((data) => {
    console.log('Device state updated:', data);
    setDevices(prev => prev.map(d => 
      d.id === data.deviceId 
        ? { ...d, switches: updateSwitches(d.switches, data.switches) }
        : d
    ));
  });

  return () => {
    socketService.off('device_connected');
    socketService.off('device_disconnected');
    socketService.off('device_state_update');
  };
}, [isAuthenticated]);
```

---

## 🎨 UI/UX Features

### **Responsive Design**
- ✅ Mobile-friendly sidebar (collapsible)
- ✅ Touch-optimized buttons
- ✅ Sheet dialog on mobile (slide-up)
- ✅ Fixed "Add Device" button (always accessible)

### **Visual Feedback**
- ✅ Real-time connection status indicator
- ✅ Loading states during navigation
- ✅ Toast notifications for success/error
- ✅ Device secret auto-copy option
- ✅ GPIO pin status badges (safe/problematic/reserved)

### **Accessibility**
- ✅ Keyboard navigation support
- ✅ Screen reader compatible
- ✅ ARIA labels on all interactive elements
- ✅ Focus management in dialogs
- ✅ Tooltip help text on GPIO pins

### **Performance Optimizations**
- ✅ Background device refresh (non-blocking)
- ✅ Debounced navigation (400ms)
- ✅ Optimistic UI updates
- ✅ Skeleton loaders during initial load
- ✅ Virtual scrolling for large device lists

---

## 🔒 Security Features

### **Permission System**
```typescript
// Sidebar visibility
requiresPermission: 'canManageDevices'

// Add Device button visibility
{isAdmin && (
  <Button onClick={() => setShowConfigDialog(true)}>
    Add Device
  </Button>
)}
```

### **Device Authentication**
- Device Secret: 48-character hex string
- MQTT message authentication
- MAC address verification
- IP address whitelisting (optional)

### **API Security**
- JWT token validation
- Role-based access control (RBAC)
- Rate limiting on device creation
- Input sanitization and validation

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Sidebar   │
│  (Devices)  │
└──────┬──────┘
       │ Click
       ▼
┌─────────────┐
│   Devices   │
│    Page     │◄─── Socket.IO (real-time updates)
└──────┬──────┘
       │ Click "Add Device"
       ▼
┌─────────────┐
│  Device     │
│  Config     │
│  Dialog     │
└──────┬──────┘
       │ Submit Form
       ▼
┌─────────────┐
│  Frontend   │
│  Validation │ (Zod schema)
└──────┬──────┘
       │ Valid
       ▼
┌─────────────┐
│  API Call   │
│ POST /api/  │
│  devices    │
└──────┬──────┘
       │ Request
       ▼
┌─────────────┐
│  Backend    │
│ Controller  │
└──────┬──────┘
       │
       ├─► Authentication
       ├─► Permission Check
       ├─► GPIO Validation
       ├─► Generate Secret
       │
       ▼
┌─────────────┐
│  MongoDB    │
│  Database   │
└──────┬──────┘
       │ Save Success
       ▼
┌─────────────┐
│  Response   │
│  + Secret   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Success    │
│   Toast     │
│  + Secret   │
│  Display    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Device     │
│  List       │
│  Refresh    │
└─────────────┘
       │
       ▼
┌─────────────┐
│  Configure  │
│  ESP32      │
│  Firmware   │
└──────┬──────┘
       │ Upload
       ▼
┌─────────────┐
│  Device     │
│  Online!    │
└─────────────┘
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: "Add Device" Button Not Visible**

**Cause**: User doesn't have admin permissions

**Solution**:
1. Check user role in Profile page
2. Contact administrator to grant admin access
3. Verify `canManageDevices` permission

---

### **Issue 2: MAC Address Validation Error**

**Cause**: Incorrect MAC address format

**Solution**:
- Use format: `AA:BB:CC:DD:EE:FF` (colons) or `AA-BB-CC-DD-EE-FF` (hyphens)
- Auto-format feature: Type `AABBCCDDEEFF` → converts to `AA:BB:CC:DD:EE:FF`

---

### **Issue 3: GPIO Pin Conflict**

**Cause**: Same GPIO used for multiple switches

**Solution**:
- Use unique GPIO pins for each relay
- Use unique GPIO pins for each manual switch
- System shows warning before submission

---

### **Issue 4: Device Secret Not Saved**

**Cause**: Secret only shown once after creation

**Solution**:
- Secret is displayed in toast for 10 seconds
- Secret is logged to browser console
- Copy secret immediately after device creation
- If lost, delete device and recreate

---

### **Issue 5: ESP8266 Switch Limit Exceeded**

**Cause**: Trying to add more than 4 switches on ESP8266

**Solution**:
- ESP8266 supports maximum 4 switches
- ESP32 supports up to 8 switches
- Remove excess switches or use ESP32

---

## 📚 Related Files

### **Frontend**:
- `src/components/Sidebar.tsx` - Main sidebar navigation
- `src/pages/Devices.tsx` - Devices management page
- `src/components/DeviceConfigDialog.tsx` - Device configuration form
- `src/hooks/useDevices.ts` - Device state management
- `src/services/api.ts` - API client for device operations
- `src/services/socket.ts` - Socket.IO real-time communication
- `src/types/index.ts` - TypeScript type definitions

### **Backend**:
- `backend/controllers/deviceController.js` - Device CRUD operations
- `backend/models/Device.js` - Device MongoDB schema
- `backend/routes/devices.js` - Device API routes
- `backend/utils/gpioUtils.js` - GPIO validation utilities
- `backend/mqtt/mqttService.js` - MQTT message handling

### **ESP32 Firmware**:
- `esp32/esp32_mqtt_client.ino` - Main ESP32 code
- `esp32/config.h` - Configuration file (device secret)
- `esp32/esp8266.ino` - ESP8266 variant

---

## ✅ Quick Reference

### **Add Device Checklist**:
- [ ] User has admin permissions
- [ ] Navigate to Devices page via sidebar
- [ ] Click "Add Device" button (bottom-right)
- [ ] Fill in device name
- [ ] Enter MAC address (format: `XX:XX:XX:XX:XX:XX`)
- [ ] Enter IP address (format: `192.168.1.100`)
- [ ] Select device type (ESP32 or ESP8266)
- [ ] Set location (Block + Floor)
- [ ] Optional: Enable PIR sensor
- [ ] Configure switches (1-8 for ESP32, 1-4 for ESP8266)
- [ ] Assign relay GPIO pins (unique)
- [ ] Optional: Enable manual switches
- [ ] Assign manual GPIO pins (unique, different from relays)
- [ ] Click "Add Device"
- [ ] **Copy device secret immediately** (shown for 10 seconds)
- [ ] Update ESP32 `config.h` with device secret
- [ ] Upload firmware to ESP32
- [ ] Verify device appears online in dashboard

---

**Total Implementation Time**: 15-20 minutes per device

**Generated**: January 19, 2025  
**By**: AutoVolt Development Team
